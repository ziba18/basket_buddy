import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Animated, Easing, Image, StyleSheet } from 'react-native';

// Holds the native splash's look (same background + logo) until the JS
// tree has laid out, hides the native splash underneath it, then fades
// itself out. Uses React Native's built-in Animated (native driver) rather
// than Reanimated — a one-off opacity fade doesn't justify shipping
// Reanimated + Worklets' native libraries in the app binary.
export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [opacity] = useState(() => new Animated.Value(1));

  if (!visible) return null;

  const fadeOut = () => {
    SplashScreen.hideAsync().finally(() => {
      Animated.timing(opacity, {
        toValue: 0,
        delay: 120,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => setVisible(false));
    });
  };

  return (
    <Animated.View onLayout={fadeOut} pointerEvents="none" style={[styles.splashOverlay, { opacity }]}>
      <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: 76,
    height: 71,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
