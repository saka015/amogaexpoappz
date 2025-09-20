import type React from "react";
import {
  View,
  KeyboardAvoidingView,
  Keyboard,
  useColorScheme,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Paperclip, ArrowUp, X } from "lucide-react-native";
import Animated,
{
  useAnimatedStyle,
  useAnimatedKeyboard,
  withSpring,
  FadeIn,
  FadeOut,
  withTiming,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { forwardRef, useEffect, useMemo, useState } from "react";
import { useImagePicker } from "@/hooks/useImagePicker";
import { Image } from "expo-image";
import { useStore } from "@/lib/globalAnalyticAssistantStore";
import { Text } from "../elements/Text";
import LucideIcon from "../LucideIcon";
import { handleApiError, handleApiSuccess } from "@/lib/toast-utils";
import { expoFetchWithAuth, generateAPIUrl } from "@/lib/utils";
import { useAuth } from "@/context/supabase-provider";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Input } from "../elements/Input";

type Props = {
  input: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  handleAudioSubmit: (audioBase64: string, mimeType: string) => void;
  handleTextSubmitLogic: (message: string) => void;
  scrollViewRef: React.RefObject<ScrollView>;
  focusOnMount?: boolean;
  requestStatus: "error" | "submitted" | "streaming" | "ready";
  settings: any;
};

interface SelectedImagesProps {
  uris: string[];
  onRemove: (uri: string) => void;
}

interface ImageItemProps {
  uri: string;
  onRemove: (uri: string) => void;
}

const modelsWithAudioSupport = ["gemini-1.5-flash", "gemini-1.5-pro"];

const ImageItem = ({ uri, onRemove }: ImageItemProps) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Animated.View
      key={uri}
      className="relative"
      entering={FadeIn.delay(150).springify()}
    >
      <View style={{ width: 55, height: 55 }}>
        <Image
          source={{ uri }}
          style={{
            width: 55,
            height: 55,
            borderRadius: 6,
            position: "absolute",
            top: 0,
            left: 0,
          }}
          contentFit="cover"
          onLoadEnd={() => setTimeout(() => setIsLoading(false), 2000)}
        />
        {isLoading && (
          <Animated.View
            className="h-[55px] w-[55px] items-center justify-center rounded-md bg-gray-300 dark:bg-gray-600"
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <ActivityIndicator size="small" color="white" />
          </Animated.View>
        )}
      </View>
      <Pressable
        onPress={() => onRemove(uri)}
        className="absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full bg-gray-200"
      >
        <X size={12} color="black" />
      </Pressable>
    </Animated.View>
  );
};

const SelectedImages = ({ uris, onRemove }: SelectedImagesProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(uris.length === 0 ? 0 : 65, {
        duration: 200,
      }),
    };
  }, [uris.length]);

  return (
    <Animated.View
      className="overflow-hidden"
      style={[animatedStyle]}
      entering={FadeIn.delay(150).springify()}
      exiting={FadeOut}
      layout={Layout.springify()}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        className="mb-4 overflow-visible px-4 py-2"
        style={{ minHeight: 65 }}
      >
        <View className="flex-row gap-4">
          {uris.map((uri) => (
            <ImageItem key={uri} uri={uri} onRemove={onRemove} />
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
};

export const ChatInput = forwardRef<TextInput, Props>(
  (
    {
      input,
      onChangeText,
      onSubmit,
      handleAudioSubmit,
      handleTextSubmitLogic,
      scrollViewRef,
      focusOnMount = false,
      requestStatus,
      settings,
    },
    ref,
  ) => {
    const { session } = useAuth();
    const { bottom } = useSafeAreaInsets();
    const keyboard = useAnimatedKeyboard();
    const { pickImage } = useImagePicker();
    const { selectedImageUris, addImageUri, removeImageUri } = useStore();

    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordMode, setRecordMode] = useState<"direct" | "transcribe">(
      "transcribe",
    );

    const { isRecording, startRecording, stopRecording, getAudioAsBase64 } =
      useAudioRecorder();

    useEffect(() => {
      if (focusOnMount) {
        (ref as React.RefObject<TextInput>).current?.focus();
      }
    }, [focusOnMount]);

    useEffect(() => {
      const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
      const focusSubscription = Keyboard.addListener("keyboardWillShow", () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });

      // const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      //   scrollViewRef.current?.scrollToEnd({ animated: true });
      // });

      return () => {
        showSubscription.remove();
        // hideSubscription.remove();
      };
    }, [scrollViewRef]);

    const animatedStyles = useAnimatedStyle(() => ({
      paddingBottom: withSpring(keyboard.height.value - bottom, {
        damping: 20,
        stiffness: 200,
      }),
    }));

    const colorScheme = useColorScheme();

    const handleAttachmentSelect = async (type: "photo" | "file") => {
      if (type === "photo") {
        const imageUris = await pickImage();
        if (imageUris) {
          imageUris.forEach((uri) => {
            addImageUri(uri);
          });
        }
      }
    };

    // --- Determine if the mic button should be shown ---
    const showMicButton = useMemo(() => {
      return true;
      return modelsWithAudioSupport.includes(settings?.model);
    }, [settings]);

    const onMicPress = async () => {
      if (isRecording) {
        const recordingResult = await stopRecording();
        if (recordingResult) {
          const audioBase64 = await getAudioAsBase64(recordingResult.uri);
          if (audioBase64) {
            if (recordMode === "direct") {
              handleAudioSubmit(audioBase64, recordingResult.mimeType);
            } else {
              await handleTranscribe(audioBase64, recordingResult.mimeType);
            }
          }
        }
      } else {
        startRecording();
      }
    };

    const handleTranscribe = async (audioBase64: string, mimeType: string) => {
      setIsTranscribing(true);
      try {
        const res = await expoFetchWithAuth(session)(
          generateAPIUrl("/api/analyticassistant/transcribe"),
          {
            method: "POST",
            body: JSON.stringify({ audioBase64, mimeType }),
          },
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        console.log("data", data);
        // onChangeText(data?.text || '');
        if (data?.transcription) {
          handleTextSubmitLogic(data?.transcription);
        } else {
          throw new Error("Empty");
        }
        handleApiSuccess("Audio transcribed!");
      } catch (error: any) {
        handleApiError(error, "Transcription Failed");
      } finally {
        setIsTranscribing(false);
      }
    };

    const toggleRecordMode = () => {
      setRecordMode((prev) => (prev === "direct" ? "transcribe" : "direct"));
    };

    return (
      <KeyboardAvoidingView>
        <Animated.View style={animatedStyles}>
          <SelectedImages uris={selectedImageUris} onRemove={removeImageUri} />
          <View className="flex-row items-center gap-2 bg-background px-4 py-2">
            {/* Custom input with icons inside border */}
            <View
              className="relative w-full max-w-3xl mx-auto"
              // style={{ minHeight: 40 }}
            >
              <Input
                ref={ref}
                className="flex h-12 w-full border bg-transparent px-3 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pr-24 py-6 rounded-full border-gray-300"
                placeholder="..."
                value={input}
                onChangeText={onChangeText}
                onSubmitEditing={() => {
                  onSubmit();
                  Keyboard.dismiss();
                }}
                // multiline
                // style={{ paddingRight: 0 }}
              />
              <View className="flex flex-row absolute right-3 top-1/2 -translate-y-1/2 items-center gap-2">
                {showMicButton && (
                  <TouchableOpacity
                    onPress={onMicPress}
                    disabled={requestStatus !== "ready" && !isRecording}
                    style={{ marginRight: 4, marginLeft: 4 }}
                  >
                    <View
                      className={`p-2 rounded-full ${
                        isRecording ? "bg-red-500" : "bg-primary"
                      }`}
                    >
                      <LucideIcon
                        name="Mic"
                        size={18}
                        className="text-primary-foreground"
                      />
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  className="rounded-full p-2 bg-primary"
                  onPress={() => {
                    onSubmit();
                    Keyboard.dismiss();
                  }}
                  disabled={
                    (requestStatus !== "ready" && requestStatus !== "error") ||
                    input.length === 0
                  }
                  style={{ marginLeft: 2 }}
                >
                  <LucideIcon name="Send" size={18} className="text-secondary" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    );
  },
);
