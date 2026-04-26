import { useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { palette, radii, shadows, typography } from "../theme";

const PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

interface Props {
  visible: boolean;
  amount: number;
  email: string;
  from: string;
  to: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

function buildPaymentPage(amount: number, email: string, reference: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, sans-serif;
      background: #F6F1E8;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      color: #6B6257;
      font-size: 14px;
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E4D8C8;
      border-top-color: #B88639;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <span>Opening payment…</span>
  </div>
  <script src="https://js.paystack.co/v1/inline.js"></script>
  <script>
    window.onload = function() {
      var handler = PaystackPop.setup({
        key: '${PUBLIC_KEY}',
        email: '${email}',
        amount: ${amount * 100},
        ref: '${reference}',
        currency: 'NGN',
        onClose: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cancel' }));
        },
        callback: function(response) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ type: 'success', reference: response.reference })
          );
        }
      });
      handler.openIframe();
    };
  </script>
</body>
</html>
  `.trim();
}

function generateRef(): string {
  return `ds_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export default function PaystackSheet({
  visible,
  amount,
  email,
  from,
  to,
  onSuccess,
  onCancel,
}: Props) {
  const reference = useRef(generateRef());

  const html = buildPaymentPage(amount, email, reference.current);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "success") {
        onSuccess(data.reference);
      } else if (data.type === "cancel") {
        onCancel();
      }
    } catch {
      // malformed message from iframe ads/trackers — ignore
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.headerLabel}>Settling up</Text>
              <Text style={styles.headerAmount}>₦{amount.toLocaleString()}</Text>
              <Text style={styles.headerParties}>
                {from} → {to}
              </Text>
            </View>
            <Pressable onPress={onCancel} style={styles.closeButton} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <WebView
            source={{ html }}
            style={styles.webview}
            onMessage={handleMessage}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={palette.accent} size="large" />
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(28, 25, 23, 0.4)",
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    height: "90%",
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
    ...shadows.card,
  },
  handle: {
    width: 54,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.line,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  headerLabel: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: palette.inkSoft,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerAmount: {
    fontFamily: typography.display,
    fontSize: 28,
    color: palette.ink,
  },
  headerParties: {
    fontFamily: typography.body,
    fontSize: 13,
    color: palette.inkSoft,
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.pill,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line,
  },
  closeText: {
    fontSize: 13,
    color: palette.inkSoft,
  },
  webview: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.background,
  },
});
