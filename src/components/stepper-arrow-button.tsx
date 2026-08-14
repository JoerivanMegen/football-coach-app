import { Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

type StepperArrowButtonProps = {
  accessibilityLabel: string;
  direction: "left" | "right";
  onPress: () => void;
};

export function StepperArrowButton({
  accessibilityLabel,
  direction,
  onPress,
}: StepperArrowButtonProps) {
  const arrowPath =
    direction === "left" ? "M34 5 L8 22 L34 39 Z" : "M10 5 L36 22 L10 39 Z";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Svg height={44} width={44} viewBox="0 0 44 44">
        <Path
          d={arrowPath}
          fill="transparent"
          stroke="#1C7C54"
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pressed: {
    opacity: 0.55,
  },
});
