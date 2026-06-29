import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'expo-router';

interface BoardIndicatorProps {
  solved: boolean;
  isActive: boolean;
  greenCount: number;
  hasYellow: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

export function BoardIndicator({
  solved,
  isActive,
  greenCount,
  hasYellow,
  onPress,
  accessibilityLabel,
}: BoardIndicatorProps) {
  const { colors } = useTheme();
  const darkTheme = colors.background === '#000000' || colors.background === '#1a1a1b';

  // Determine target colors based on current state
  const getColors = () => {
    if (isActive) {
      return {
        borderColor: solved ? '#6aaa64' : '#5BA75A',
        backgroundColor: solved ? '#6aaa64' : 'transparent',
        textColor: solved ? '#ffffff' : '#5BA75A',
      };
    }
    return {
      borderColor: solved || (!hasYellow && greenCount > 0) ? '#6aaa64' : hasYellow ? '#c9b458' : '#878a8c',
      backgroundColor: solved ? '#6aaa64' : hasYellow ? (darkTheme ? (colors.background as string) : '#ffffff') : 'transparent',
      textColor: solved ? '#ffffff' : greenCount > 0 ? '#6aaa64' : '#878a8c',
    };
  };

  const targetColors = getColors();
  const borderColorValue = useSharedValue(targetColors.borderColor);
  const backgroundColorValue = useSharedValue(targetColors.backgroundColor);
  const textColorValue = useSharedValue(targetColors.textColor);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Scale pop: 1.0 → 1.1 → 1.0 over 400ms
    scale.value = withSequence(
      withTiming(1.1, { duration: 200, easing: Easing.out(Easing.ease) }),
      withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) })
    );

    // Color animation: 500ms fade to new colors
    const colorTiming = { duration: 500, easing: Easing.inOut(Easing.ease) };
    borderColorValue.value = withTiming(targetColors.borderColor, colorTiming);
    backgroundColorValue.value = withTiming(targetColors.backgroundColor, colorTiming);
    textColorValue.value = withTiming(targetColors.textColor, colorTiming);
  }, [solved, isActive, greenCount, hasYellow, darkTheme]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: borderColorValue.value,
    backgroundColor: backgroundColorValue.value,
    transform: [{ scale: scale.value }],
  }), []);

  const animatedTextStyle = useAnimatedStyle(() => ({
    color: textColorValue.value,
  }), []);

  return (
    <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} hitSlop={6}>
      <Animated.View
        style={[
          {
            width: 24,
            height: 24,
            borderWidth: 2,
            borderRadius: isActive ? 2 : 12,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        {solved ? (
          <Animated.Text style={[{ fontSize: 14, fontWeight: 'bold' }, animatedTextStyle]}>✓</Animated.Text>
        ) : isActive ? (
          <Ionicons name="play" size={10} color={targetColors.textColor} />
        ) : greenCount > 0 ? (
          <Animated.Text style={[{ fontSize: 10, fontWeight: 'bold' }, animatedTextStyle]}>{greenCount}</Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
