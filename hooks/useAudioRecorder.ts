import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import {
    useAudioRecorder as useExpoAudioRecorder,
    RecordingPresets,
    AudioModule,
    setAudioModeAsync,
    useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system';

type RecordingResult = {
    uri: string;
    mimeType: string;
};

export function useAudioRecorder() {
    const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(recorder);

    useEffect(() => {
        (async () => {
            // No permissions needed for web, but this is fine.
            const { granted } = await AudioModule.requestRecordingPermissionsAsync();
            if (!granted) {
                Alert.alert('Permission required', 'Microphone access is needed for audio prompts.');
            }
            // Set audio mode for iOS playback in silent mode
            if (Platform.OS !== 'web') {
                await setAudioModeAsync({
                    playsInSilentMode: true,
                    allowsRecording: true,
                });
            }
        })();
    }, []);

    const startRecording = async () => {
        try {
            if (recorder.isRecording) return;
            console.log('Preparing to record...');
            await recorder.prepareToRecordAsync();
            console.log('Starting recording...');
            await recorder.record();
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async (): Promise<RecordingResult | null> => {
        if (!recorder.isRecording) return null;

        console.log('Stopping recording...');
        try {
            await recorder.stop();
            const uri = recorder.uri;

            if (!uri) {
                console.warn('Stopping recording did not return a URI.');
                return null;
            }

            console.log('Recording stopped and stored at', uri);

            // expo-audio uses 'audio/webm' on web and 'audio/mp4' (m4a) on mobile
            const mimeType = Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';

            return { uri, mimeType };

        } catch (error) {
            console.error("Error stopping recording:", error);
            return null;
        }
    };

    // --- MODIFIED FUNCTION ---
    const getAudioAsBase64 = async (uri: string): Promise<string | null> => {
        // Platform-specific logic to read the file/blob
        if (Platform.OS === 'web') {
            try {
                // On web, the URI is a blob URL. We fetch it to get the blob.
                const response = await fetch(uri);
                const blob = await response.blob();

                // We use FileReader to convert the blob to a Base64 data URL.
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        // The result is a string like "data:audio/webm;base64,..."
                        // We only want the part after the comma.
                        const base64data = (reader.result as string).split(',')[1];
                        resolve(base64data);
                    };
                    reader.onerror = (error) => {
                        console.error("FileReader error:", error);
                        reject(null);
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error("Error converting audio blob to Base64 on web:", error);
                return null;
            }
        } else {
            // On mobile, we use the FileSystem API as before.
            try {
                const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                return base64;
            } catch (error) {
                console.error("Error converting audio to Base64 on mobile:", error);
                return null;
            }
        }
    };

    // The state from the hook is more reliable than local state.
    const isRecording = recorderState?.isRecording ?? false;

    return { isRecording, startRecording, stopRecording, getAudioAsBase64 };
}