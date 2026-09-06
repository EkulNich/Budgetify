import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";

import { parseReceiptResponse, type ScannedReceipt } from "@/lib/receipt";
import { supabase } from "@/lib/supabase";

const IMAGE_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  base64: true,
  quality: 0.5,
};

async function scanReceiptImage(
  imageBase64: string,
  mimeType: string,
): Promise<ScannedReceipt> {
  const { data, error } = await supabase.functions.invoke("scan-receipt", {
    body: { imageBase64, mimeType },
  });

  if (error) {
    console.error("Failed to scan receipt:", error);
    throw error;
  }

  return parseReceiptResponse(data.text as string);
}

/** Lets the user photograph or pick a receipt image, then extracts amount/description/date from it. */
export function useReceiptScan() {
  const [scanning, setScanning] = useState(false);

  const handleResult = async (
    result: ImagePicker.ImagePickerResult,
  ): Promise<ScannedReceipt | null> => {
    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset?.base64) return null;

    setScanning(true);
    try {
      return await scanReceiptImage(asset.base64, asset.mimeType ?? "image/jpeg");
    } catch (error) {
      Alert.alert("Error", "Failed to scan receipt: " + (error as Error).message);
      return null;
    } finally {
      setScanning(false);
    }
  };

  const scanFromCamera = async (): Promise<ScannedReceipt | null> => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera access is required to scan a receipt.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync(IMAGE_OPTIONS);
    return handleResult(result);
  };

  const scanFromLibrary = async (): Promise<ScannedReceipt | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Photo library access is required to scan a receipt.",
      );
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync(IMAGE_OPTIONS);
    return handleResult(result);
  };

  /** Shows a "Take Photo" / "Choose from Library" prompt, then scans whichever is picked. */
  const presentScanOptions = (): Promise<ScannedReceipt | null> =>
    new Promise((resolve) => {
      Alert.alert("Scan Receipt", "Add a photo of your receipt", [
        {
          text: "Take Photo",
          onPress: () => scanFromCamera().then(resolve),
        },
        {
          text: "Choose from Library",
          onPress: () => scanFromLibrary().then(resolve),
        },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    });

  return { scanning, presentScanOptions };
}
