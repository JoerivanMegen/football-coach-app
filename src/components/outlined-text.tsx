import type { ReactNode } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import {
  ThemedText,
  type ThemedTextProps,
} from "@/components/themed-text";

const outlineDirections = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const;

type OutlinedTextProps = Omit<ThemedTextProps, "children" | "style"> & {
  children: ReactNode;
  color: string;
  containerStyle?: StyleProp<ViewStyle>;
  outlineColor: string;
  outlineWidth?: number;
  style?: StyleProp<TextStyle>;
};

export function OutlinedText({
  children,
  color,
  containerStyle,
  outlineColor,
  outlineWidth = 1,
  style,
  ...textProps
}: OutlinedTextProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {outlineDirections.map(([horizontal, vertical]) => (
        <ThemedText
          {...textProps}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          key={`${horizontal}-${vertical}`}
          pointerEvents="none"
          style={[
            style,
            styles.outlineLayer,
            {
              color: outlineColor,
              transform: [
                { translateX: horizontal * outlineWidth },
                { translateY: vertical * outlineWidth },
              ],
            },
          ]}
        >
          {children}
        </ThemedText>
      ))}
      <ThemedText {...textProps} style={[style, { color }]}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  outlineLayer: {
    left: 0,
    position: "absolute",
    top: 0,
  },
});
