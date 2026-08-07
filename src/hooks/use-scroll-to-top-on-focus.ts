import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { Platform, type ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useScrollToTopOnFocus(onBeforeScrollReset?: () => void) {
  const scrollViewRef = useRef<ScrollView>(null);
  const safeAreaInsets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (onBeforeScrollReset) {
          onBeforeScrollReset();
        }

        scrollViewRef.current?.scrollTo({
          animated: false,
          y: Platform.OS === "ios" ? -safeAreaInsets.top : 0,
        });
      };
    }, [onBeforeScrollReset, safeAreaInsets.top]),
  );

  return scrollViewRef;
}
