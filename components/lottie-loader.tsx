import { useEffect, useRef } from "react";
import { View } from "react-native";
import LottieView from "lottie-react-native";
import loaderAnimation from "../assets/loader-three-dots.json";

export const LottieLoader = ({ width = 60, height = 60 }) => {
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    // Optionally play from code
    animationRef.current?.play();
  }, []);

  return (
    <View
      style={{
        width,
        height,
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      <LottieView
        ref={animationRef}
        source={loaderAnimation}
        autoPlay
        loop
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
};
