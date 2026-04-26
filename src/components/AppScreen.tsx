import { PropsWithChildren } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette } from "../theme";

interface Props extends PropsWithChildren {
  contentContainerStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AppScreen({
  children,
  contentContainerStyle,
  scroll = false,
  style,
}: Props) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.background}>
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />
        {scroll ? (
          <ScrollView
            bounces={false}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            style={style}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentContainerStyle, style]}>
            {children}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  background: {
    flex: 1,
    backgroundColor: palette.background,
    position: "relative",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  blobTop: {
    position: "absolute",
    top: -32,
    right: -44,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: palette.accentSoft,
    opacity: 0.65,
  },
  blobBottom: {
    position: "absolute",
    left: -60,
    bottom: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: palette.backgroundStrong,
    opacity: 0.9,
  },
});
