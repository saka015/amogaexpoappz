import React, { useRef, useState, useEffect } from "react";
import { View, Text as RNText, Pressable, LayoutChangeEvent } from "react-native";
import { Button } from "@/components/ui/button";
import { Play, Pause, RefreshCw, Loader2 } from "lucide-react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Text } from "@/components/ui/text";
import LucideIcon from "../LucideIcon";

type Props = {
  source: string | number;
};

export const AudioPlayer: React.FC<Props> = ({ source }) => {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  const barWidthRef = useRef(1);
  const [position, setPosition] = useState(0);

  const duration = status?.duration ?? 0;
  const pct = duration ? (position / duration) * 100 : 0;

  // Sync position
  useEffect(() => {
    const interval = setInterval(() => {
      if (status?.isLoaded) setPosition(status.currentTime);
    }, 200);
    return () => clearInterval(interval);
  }, [status]);

  const togglePlay = async () => {
    if (!status?.isLoaded) return;
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish) await player.seekTo(0);
      await player.play();
    }
  };

  const replay = async () => {
    if (!status?.isLoaded) return;
    await player.seekTo(0);
    await player.play();
  };

  const seek = async (x: number) => {
    if (!status?.isLoaded) return;
    const sec = Math.min(duration, Math.max(0, (x / barWidthRef.current) * duration));
    setPosition(sec);
    await player.seekTo(sec);
  };

  return (
    <View className="my-3">
      <View className="flex-row items-center justify-between mb-2">
        <Button
          size="icon"
          variant="outline"
          onPress={togglePlay}
          className="rounded-full"
        >
          {status?.isBuffering ? (
            <LucideIcon name="Loader" size={16} className="text-primary"/>
          ) : status?.playing ? (
            <LucideIcon name="Pause" size={16} className="text-primary"/>
          ) : (
            <LucideIcon name="Play" size={16} className="text-primary"/>
          )}
        </Button>
        <Button size="icon" variant="outline" onPress={replay} className="rounded-full ml-2">
          <LucideIcon name="RefreshCw" size={16} className="text-primary"/>
        </Button>
        <RNText className="text-xs text-muted-foreground ml-2">
          {formatTime(position)} / {formatTime(duration)}
        </RNText>
      </View>

      <Pressable
        onLayout={(e: LayoutChangeEvent) => (barWidthRef.current = e.nativeEvent.layout.width)}
        onPress={(e) => seek(e.nativeEvent.locationX)}
        className="h-2 w-full rounded-full bg-muted overflow-hidden"
      >
        <View className="h-2 bg-primary" style={{ width: `${pct}%` }} />
      </Pressable>
    </View>
  );
};

function formatTime(sec: number) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
