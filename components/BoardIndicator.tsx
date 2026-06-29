import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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
  // Determine colors based on current state
  let borderColor: string;
  let backgroundColor: string;
  let textColor: string;

  if (isActive) {
    borderColor = solved ? '#6aaa64' : '#5BA75A';
    backgroundColor = solved ? '#6aaa64' : 'transparent';
    textColor = solved ? '#ffffff' : '#5BA75A';
  } else {
    borderColor = solved || (!hasYellow && greenCount > 0) ? '#6aaa64' : hasYellow ? '#c9b458' : '#878a8c';
    backgroundColor = solved ? '#6aaa64' : hasYellow ? '#ffffff' : 'transparent';
    textColor = solved ? '#ffffff' : greenCount > 0 ? '#6aaa64' : '#878a8c';
  }

  return (
    <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} hitSlop={6}>
      <Animated.View
        style={{
          width: 24,
          height: 24,
          borderWidth: 2,
          borderRadius: isActive ? 2 : 12,
          borderColor,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {solved ? (
          <Animated.Text style={{ fontSize: 14, fontWeight: 'bold', color: textColor }}>✓</Animated.Text>
        ) : isActive ? (
          <Ionicons name="play" size={10} color={textColor} />
        ) : greenCount > 0 ? (
          <Animated.Text style={{ fontSize: 10, fontWeight: 'bold', color: textColor }}>{greenCount}</Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
