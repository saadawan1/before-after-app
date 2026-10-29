// ============================================================
// Village Council Work Documentation App
// Built with Expo (React Native)
// Required packages:
//   npx create-expo-app VillageApp
//   cd VillageApp
//   npx expo install expo-camera expo-image-picker expo-location
//     expo-media-library expo-file-system expo-sharing
//     expo-asset @react-native-async-storage/async-storage
//     expo-image-manipulator react-native-view-shot
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { NavigationContainer } from "@react-navigation/native";
import { registerRootComponent } from "expo";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import "react-native-gesture-handler";
import ImageViewer from "react-native-image-zoom-viewer";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Share from "react-native-share";
import { captureRef } from "react-native-view-shot";

const Drawer = createDrawerNavigator();

// â”€â”€â”€ Responsive Dimensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const scale = SCREEN_WIDTH / 375; // Base width (iPhone SE)
const responsiveSize = (size) => Math.round(size * scale);
const responsiveFontSize = (size) => Math.round(size * scale);

// â”€â”€â”€ Storage Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COUNCIL_KEY = "@council_info";
const CARDS_KEY = "@work_cards";
const SHOW_COUNCIL_KEY = "@show_council_details";
const SAME_TAG_KEY = "@same_tag_for_all";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const formatDate = (iso) => {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    // Android exposes isFromMockProvider() via loc.mocked
    if (loc.mocked === true) {
      return { mocked: true };
    }

    const lat = loc.coords.latitude.toFixed(5);
    const lon = loc.coords.longitude.toFixed(5);
    return {
      coords: `${lat}, ${lon}`,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      accuracy: loc.coords.accuracy,
      timestamp: loc.timestamp,
      mocked: false,
    };
  } catch {
    return null;
  }
};

// Validate location to prevent GPS spoofing
const validateLocation = async (location, lastLocation) => {
  if (!location) {
    Alert.alert(
      "Location Error",
      "Could not retrieve GPS coordinates. Please check your GPS signal.",
    );
    return false;
  }

  // Check Android mock location flag (isFromMockProvider)
  if (location.mocked === true) {
    Alert.alert(
      "Fake GPS Detected",
      "A mock location app is active on this device. Please disable fake GPS and try again.",
      [
        { text: "Open Settings", onPress: () => Linking.openSettings() },
        { text: "Cancel", style: "cancel" },
      ],
    );
    return false;
  }

  // Check accuracy (reject if > 50 meters)
  if (location.accuracy > 50) {
    Alert.alert(
      "Poor GPS Signal",
      `GPS accuracy is ${location.accuracy.toFixed(0)}m. Please move to an open area with clear sky view (need < 50m accuracy).`,
      [
        { text: "Retry", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ],
    );
    return false;
  }

  // Check for impossible speeds (if last location exists)
  if (lastLocation && lastLocation.timestamp) {
    const timeDiff = (location.timestamp - lastLocation.timestamp) / 1000; // seconds
    if (timeDiff > 5) {
      // Only check if > 5 seconds have passed
      const distance = getDistanceFromLatLon(
        lastLocation.latitude,
        lastLocation.longitude,
        location.latitude,
        location.longitude,
      );
      // Flag if traveling > 180 km/h (50 m/s) - impossible for field work
      const speedMps = distance / timeDiff;
      if (speedMps > 50) {
        Alert.alert(
          "Suspicious Location Jump",
          `Location jumped ${distance.toFixed(0)}m in ${timeDiff.toFixed(0)}s. Please verify GPS accuracy.`,
        );
        return false;
      }
    }
  }

  return true;
};

// Helper: Calculate distance between two coordinates (Haversine formula)
const getDistanceFromLatLon = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
};

// Add metadata overlay to image with white border
const addMetadataToImage = async (uri, timestamp, gps) => {
  try {
    const { width, height } = await new Promise((resolve) => {
      Image.getSize(uri, (w, h) => resolve({ width: w, height: h }));
    });

    // Create white border (2.5% of image dimensions)
    const borderWidth = Math.floor(Math.min(width, height) * 0.025);
    const newWidth = width + borderWidth * 2;
    const newHeight = height + borderWidth * 2;

    // First: Add white border
    const bordered = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: { width, height },
        },
      ],
      {
        compress: 1.0,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      },
    );

    // Create metadata text overlay
    const dateText = formatDate(timestamp);
    const metadataText = `${dateText}   ${gps}`;

    // Note: React Native doesn't support direct text overlay via ImageManipulator
    // We'll add border and return. Text will be shown separately in the card.
    // For production, consider using react-native-canvas or server-side processing

    return bordered.uri;
  } catch (error) {
    console.error("Error adding metadata:", error);
    return uri; // Return original if processing fails
  }
};

// â”€â”€â”€ Setup Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SetupScreen({ onSave }) {
  const [tag, setTag] = useState("");

  const save = async () => {
    if (!tag.trim()) {
      Alert.alert("Required", "Please enter an image tag.");
      return;
    }
    const info = {
      tag: tag.trim(),
    };
    await AsyncStorage.setItem(COUNCIL_KEY, JSON.stringify(info));
    onSave(info);
  };

  return (
    <SafeAreaView style={s.setupContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1a6b3c" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: responsiveSize(20),
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.setupCard}>
            <Text style={s.setupTitle}>⚙ App Setup</Text>
            <Text style={s.setupSub}>
              This tag will appear on all your images.
            </Text>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Image Tag</Text>
              <TextInput
                style={s.input}
                value={tag}
                onChangeText={setTag}
                placeholder="Enter your image tag"
                placeholderTextColor="#999"
                keyboardType="default"
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={save}>
              <Text style={s.saveBtnTxt}>Save & Continue →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// â”€â”€â”€ Per-Card Tag Input Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PerCardTagInput({ cardId, initialTag, onSave }) {
  const [tag, setTag] = useState(initialTag);
  const [isEditing, setIsEditing] = useState(!initialTag); // Start editing only if no initial tag
  const [isSaved, setIsSaved] = useState(!!initialTag); // Mark as saved if there's an initial tag

  const handleSave = () => {
    if (tag.trim()) {
      onSave(tag);
      setIsSaved(true);
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsSaved(false);
    setIsEditing(true);
  };

  return (
    <View style={ms.tagInputWrap}>
      {!isSaved && (
        <TextInput
          style={ms.tagInput}
          value={tag}
          onChangeText={setTag}
          onFocus={() => setIsEditing(true)}
          placeholder="Enter tag for this card..."
          placeholderTextColor="#999"
        />
      )}
      {isSaved && (
        <TouchableOpacity style={ms.tagEditBtn} onPress={handleEdit}>
          <Text style={ms.tagEditBtnTxt}>Edit Tag</Text>
        </TouchableOpacity>
      )}
      {isEditing && !isSaved && (
        <TouchableOpacity style={ms.tagSaveBtn} onPress={handleSave}>
          <Text style={ms.tagSaveBtnTxt}>Save Tag</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// â”€â”€â”€ Settings Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SettingsScreen({ route, navigation }) {
  const {
    info: currentInfo,
    onSave,
    showCouncilDetails: initialShowCouncil,
    setShowCouncilDetails: onToggleShowCouncil,
    sameTagForAll: initialSameTag,
    setSameTagForAll: onToggleSameTag,
  } = route.params;

  const [tag, setTag] = useState(currentInfo.tag || "");
  const [showCouncil, setShowCouncil] = useState(initialShowCouncil);
  const [sameTag, setSameTag] = useState(initialSameTag);

  const save = async () => {
    if (!tag.trim()) {
      Alert.alert("Required", "Please enter an image tag.");
      return;
    }
    const info = {
      tag: tag.trim(),
    };
    await AsyncStorage.setItem(COUNCIL_KEY, JSON.stringify(info));
    onSave(info);
    Alert.alert("Success", "Settings updated successfully!");
  };

  const handleToggleShowCouncil = async (val) => {
    setShowCouncil(val);
    await AsyncStorage.setItem(SHOW_COUNCIL_KEY, JSON.stringify(val));
    onToggleShowCouncil(val);
  };

  const handleToggleSameTag = async (val) => {
    setSameTag(val);
    await AsyncStorage.setItem(SAME_TAG_KEY, JSON.stringify(val));
    onToggleSameTag(val);
  };

  return (
    <SafeAreaView style={ms.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a6b3c" />

      {/* Header */}
      <View style={ms.header}>
        <TouchableOpacity
          style={ms.menuBtn}
          onPress={() => navigation.openDrawer()}
        >
          <Text style={{ fontSize: 28, color: "#fff" }}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={ms.headerTitle}>⚙️ Settings</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: responsiveSize(20),
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.setupCard}>
            <Text style={s.setupTitle}>⚙️Settings</Text>
            <Text style={s.setupSub}>
              Update your image tag and display preferences
            </Text>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Image Tag</Text>
              <TextInput
                style={s.input}
                value={tag}
                onChangeText={setTag}
                placeholder="Enter your image tag"
                placeholderTextColor="#999"
                keyboardType="default"
                autoCorrect={false}
                autoCapitalize="words"
              />
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={save}>
              <Text style={s.saveBtnTxt}>Save Changes</Text>
            </TouchableOpacity>

            <View style={s.settingRow}>
              <Text style={s.fieldLabel}>Show Tag on Card</Text>
              <Switch
                value={showCouncil}
                onValueChange={handleToggleShowCouncil}
                thumbColor="#1a6b3c"
                trackColor={{ true: "#a5d6a7", false: "#ccc" }}
              />
            </View>

            <View style={s.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Same Tag for All Images</Text>
                {!sameTag && (
                  <Text style={s.setupSub}>
                    You can write a custom tag on each card
                  </Text>
                )}
              </View>
              <Switch
                value={sameTag}
                onValueChange={handleToggleSameTag}
                thumbColor="#1a6b3c"
                trackColor={{ true: "#a5d6a7", false: "#ccc" }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// â”€â”€â”€ Credits Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreditsScreen({ navigation }) {
  return (
    <SafeAreaView style={ms.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a6b3c" />

      {/* Header */}
      <View style={ms.header}>
        <TouchableOpacity
          style={ms.menuBtn}
          onPress={() => navigation.openDrawer()}
        >
          <Text style={{ fontSize: 28, color: "#fff" }}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={ms.headerTitle}>📝 Credits</Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: responsiveSize(20),
        }}
      >
        <View style={s.setupCard}>
          <Text style={s.setupTitle}>📝 Credits</Text>
          <View style={{ marginTop: 20 }}>
            <Text style={s.creditsHeading}>
              Before and After Image Comparison App{"\n"}Field Monitoring App
            </Text>
            <Text style={s.creditsText}>Version 1.0.0</Text>

            <Text style={[s.creditsHeading, { marginTop: 20 }]}>Purpose</Text>
            <Text style={s.creditsText}>
              This application helps users who want to capture before and after
              image of their activities or products and then place them side by
              side note the difference.
            </Text>

            <Text style={[s.creditsHeading, { marginTop: 20 }]}>Features</Text>
            <Text style={s.creditsText}>Before/After photo documentation</Text>
            <Text style={s.creditsText}>GPS coordinates on every record</Text>
            <Text style={s.creditsText}>Timestamp metadata</Text>
            <Text style={s.creditsText}>Share work cards as images</Text>
            <Text style={s.creditsText}>Record daily attendance</Text>
            <Text style={s.creditsText}>Offline-first data storage</Text>

            <Text style={[s.creditsHeading, { marginTop: 20 }]}>
              Built With
            </Text>
            <Text style={s.creditsText}>React Native & Expo</Text>

            <Text style={[s.creditsHeading, { marginTop: 20 }]}>
              Developed By
            </Text>
            <Text style={s.creditsText}>Saad Shaukat</Text>

            <Text
              style={[
                s.creditsText,
                { marginTop: 30, textAlign: "center", fontStyle: "italic" },
              ]}
            >
              © 2026 Saad Shaukat. All rights reserved. For support or
              inquiries, please contact the developer at "ssawan121@gmail.com"
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// â”€â”€â”€ Gallery Work Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GalleryWorkScreen({ navigation, showCouncilDetails, sameTagForAll }) {
  const [info, setInfo] = useState(null);
  const [cards, setCards] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [fullScreenCard, setFullScreenCard] = useState(null);
  const cardRefs = useRef({});
  const previousTags = useRef({});
  const insets = useSafeAreaInsets();

  // Load council info and cards
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(COUNCIL_KEY);
      if (raw) setInfo(JSON.parse(raw));

      const cardsRaw = await AsyncStorage.getItem("@gallery_work_cards");
      if (cardsRaw) setCards(JSON.parse(cardsRaw));
    })();
  }, []);

  const persist = async (updated) => {
    setCards(updated);
    await AsyncStorage.setItem("@gallery_work_cards", JSON.stringify(updated));
  };

  // Pick BEFORE photo from gallery
  const pickBefore = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Gallery access is required.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 1.0,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (res.canceled) return;

    setLoading(true);
    const timestamp = new Date().toISOString();

    const newCard = {
      id: Date.now().toString(),
      beforeUri: res.assets[0].uri,
      beforeMetadata: null,
      afterUri: null,
      afterMetadata: null,
      createdAt: timestamp,
      gps: null,
      tag: "",
    };
    await persist([...cards, newCard]);
    setLoading(false);
  };

  // Pick AFTER photo from gallery
  const pickAfter = async (cardId) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Gallery access is required.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 1.0,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (res.canceled) return;

    setLoading(true);

    const updated = cards.map((c) =>
      c.id === cardId
        ? {
            ...c,
            afterUri: res.assets[0].uri,
            afterMetadata: null,
          }
        : c,
    );
    await persist(updated);
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(cards.map((c) => c.id)));
  const clearSel = () => {
    setSelected(new Set());
    setSelectMode(false);
  };

  // Encode card as JPG after both images are present
  const encodeCard = async (cardId) => {
    const ref = cardRefs.current[cardId];
    if (!ref) return;

    try {
      const uri = await captureRef(ref, { format: "jpg", quality: 0.95 });
      const encodedUri = `file://${uri}`;

      const updated = cards.map((c) =>
        c.id === cardId ? { ...c, encodedUri } : c,
      );
      await persist(updated);
    } catch (error) {
      console.log("Card encoding failed:", error);
    }
  };

  // Auto-encode cards when both images are present or tag changes
  useEffect(() => {
    cards.forEach((card) => {
      if (card.beforeUri && card.afterUri) {
        const previousTag = previousTags.current[card.id];
        const currentTag = card.tag || "";

        // Encode if: 1) No encodedUri yet, or 2) Tag has changed
        if (
          !card.encodedUri ||
          (card.encodedUri && previousTag !== currentTag)
        ) {
          // Delay encoding slightly to ensure card is rendered
          setTimeout(() => encodeCard(card.id), 300);
        }

        // Update previous tag
        previousTags.current[card.id] = currentTag;
      }
    });
  }, [cards]);

  const shareSelected = async () => {
    if (selected.size === 0) {
      Alert.alert("None selected", "Please select at least one card to share.");
      return;
    }
    setLoading(true);
    try {
      const uris = await Promise.all(
        [...selected].map(async (id) => {
          const ref = cardRefs.current[id];
          if (!ref) return null;
          // Use encodedUri if available, otherwise capture on demand
          const card = cards.find((c) => c.id === id);
          if (card?.encodedUri) {
            return card.encodedUri;
          }
          const uri = await captureRef(ref, { format: "jpg", quality: 0.95 });
          return `file://${uri}`;
        }),
      );
      const sharedUris = uris.filter(Boolean);
      if (sharedUris.length === 0) {
        setLoading(false);
        return;
      }

      try {
        await Share.shareSingle({
          urls: sharedUris,
          social: Share.Social.WHATSAPP,
          type: "image/jpeg",
        });
      } catch (whatsappError) {
        await Share.open({
          urls: sharedUris,
          type: "image/jpeg",
        });
      }

      setLoading(false);
      clearSel();
      Alert.alert("Success", "Images shared successfully.");
    } catch (e) {
      if (e?.message !== "User did not share" && e?.error !== "User canceled") {
        Alert.alert("Share failed", e.message ?? "Could not share the cards.");
      }
      setLoading(false);
      clearSel();
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) {
      Alert.alert(
        "None selected",
        "Please select at least one card to delete.",
      );
      return;
    }

    Alert.alert(
      "Delete Cards",
      `How would you like to delete ${selected.size} card(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Without Saving",
          style: "destructive",
          onPress: async () => {
            const updated = cards.filter((c) => !selected.has(c.id));
            await persist(updated);
            clearSel();
            Alert.alert("Success", "Cards deleted from app.");
          },
        },
        {
          text: "Save & Delete",
          onPress: async () => {
            setLoading(true);
            try {
              // Capture all selected cards
              const uris = await Promise.all(
                [...selected].map(async (id) => {
                  const ref = cardRefs.current[id];
                  if (!ref) return null;
                  const uri = await captureRef(ref, {
                    format: "jpg",
                    quality: 0.95,
                  });
                  return `file://${uri}`;
                }),
              );
              const capturedUris = uris.filter(Boolean);

              if (capturedUris.length === 0) {
                setLoading(false);
                Alert.alert("Error", "Could not capture images.");
                return;
              }

              // Request media library permissions
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status !== "granted") {
                setLoading(false);
                Alert.alert(
                  "Permission needed",
                  "Gallery access is required to save images.",
                );
                return;
              }

              // Save all images to gallery
              for (const uri of capturedUris) {
                const cleanUri = uri.replace("file://", "");
                await MediaLibrary.saveToLibraryAsync(cleanUri);
              }

              // Delete from app
              const updated = cards.filter((c) => !selected.has(c.id));
              await persist(updated);
              setLoading(false);
              clearSel();
              Alert.alert(
                "Success",
                `${capturedUris.length} image(s) saved to gallery and deleted from app.`,
              );
            } catch (error) {
              setLoading(false);
              Alert.alert(
                "Error",
                error.message ?? "Could not save images to gallery.",
              );
            }
          },
        },
      ],
    );
  };

  // Full Screen Modal Component
  const FullScreenModal = ({
    visible,
    card,
    info,
    showCouncilDetails,
    sameTagForAll,
    onClose,
  }) => {
    if (!card) return null;

    const location = sameTagForAll ? info?.tag || "" : card.tag || "";

    // If card has been encoded, show the encoded image with zoom/pan
    if (card.encodedUri) {
      const imageUrl = [{ url: card.encodedUri }];

      return (
        <Modal
          visible={visible}
          transparent={false}
          animationType="fade"
          onRequestClose={onClose}
        >
          <View style={{ flex: 1, backgroundColor: "#000" }}>
            <TouchableOpacity
              style={[ms.fullScreenClose, { zIndex: 1000 }]}
              onPress={onClose}
            >
              <Text style={ms.fullScreenCloseTxt}>✕</Text>
            </TouchableOpacity>

            <ImageViewer
              imageUrls={imageUrl}
              enableSwipeDown
              onSwipeDown={onClose}
              backgroundColor="#000"
              renderIndicator={() => null}
              enablePreload
              saveToLocalByLongPress={false}
            />

            {showCouncilDetails && location.length > 0 && (
              <View
                style={[
                  ms.fullScreenTag,
                  { position: "absolute", bottom: 40, left: 20, right: 20 },
                ]}
              >
                <Text style={ms.fullScreenTagText}>{location}</Text>
              </View>
            )}
          </View>
        </Modal>
      );
    }

    // Fallback: Show before/after images side by side (while encoding or if encoding failed)
    const beforeMeta = card.beforeMetadata
      ? `${formatDate(card.beforeMetadata.timestamp)}   ${card.beforeMetadata.gps}`
      : `${formatDate(card.createdAt)}   ${card.gps || "GPS unavailable"}`;
    const afterMeta = card.afterMetadata
      ? `${formatDate(card.afterMetadata.timestamp)}   ${card.afterMetadata.gps}`
      : "";

    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
        onRequestClose={onClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity style={ms.fullScreenClose} onPress={onClose}>
            <Text style={ms.fullScreenCloseTxt}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 20,
            }}
          >
            {/* Before and After Images Side by Side */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {/* BEFORE */}
              <View style={{ flex: 1 }}>
                <Text style={[ms.fullScreenLabel, { textAlign: "center" }]}>
                  BEFORE
                </Text>
                {card.beforeUri ? (
                  <View>
                    <Image
                      source={{ uri: card.beforeUri }}
                      style={{
                        width: "100%",
                        height: SCREEN_HEIGHT * 0.5,
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                    {card.beforeMetadata && (
                      <View style={[ms.fullScreenMeta, { marginTop: 8 }]}>
                        <Text style={ms.fullScreenMetaText}>{beforeMeta}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: SCREEN_HEIGHT * 0.5,
                      backgroundColor: "#222",
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#666", fontSize: 14 }}>
                      No Image
                    </Text>
                  </View>
                )}
              </View>

              {/* AFTER */}
              <View style={{ flex: 1 }}>
                <Text style={[ms.fullScreenLabel, { textAlign: "center" }]}>
                  AFTER
                </Text>
                {card.afterUri ? (
                  <View>
                    <Image
                      source={{ uri: card.afterUri }}
                      style={{
                        width: "100%",
                        height: SCREEN_HEIGHT * 0.5,
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                    {card.afterMetadata && (
                      <View style={[ms.fullScreenMeta, { marginTop: 8 }]}>
                        <Text style={ms.fullScreenMetaText}>{afterMeta}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: SCREEN_HEIGHT * 0.5,
                      backgroundColor: "#222",
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#666", fontSize: 14 }}>Pending</Text>
                  </View>
                )}
              </View>
            </View>

            {showCouncilDetails && location.length > 0 && (
              <View style={ms.fullScreenTag}>
                <Text style={ms.fullScreenTagText}>{location}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderCard = ({ item }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        activeOpacity={selectMode ? 0.7 : 1}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          } else if (item.beforeUri && item.afterUri) {
            setFullScreenCard(item);
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            setSelected(new Set([item.id]));
          }
        }}
        style={[ms.cardWrap, isSelected && ms.cardSelected]}
      >
        {selectMode && (
          <View style={ms.checkbox}>
            <Text
              style={{ color: isSelected ? "#1a6b3c" : "#ccc", fontSize: 22 }}
            >
              {isSelected ? "✔" : "☐"}
            </Text>
          </View>
        )}

        <CompositeCard
          ref={(el) => {
            if (el) cardRefs.current[item.id] = el;
          }}
          card={item}
          info={info || { tag: "Gallery Work" }}
          showCouncilDetails={showCouncilDetails}
          sameTagForAll={sameTagForAll}
        />

        {/* Per-card tag input when same-tag mode is off AND tag display is on */}
        {!sameTagForAll && !selectMode && showCouncilDetails && (
          <PerCardTagInput
            cardId={item.id}
            initialTag={item.tag || ""}
            onSave={(newTag) => {
              const updated = cards.map((c) =>
                c.id === item.id ? { ...c, tag: newTag } : c,
              );
              persist(updated);
            }}
          />
        )}

        {!item.afterUri && !selectMode && (
          <TouchableOpacity
            style={ms.afterBtn}
            onPress={() => pickAfter(item.id)}
          >
            <Text style={ms.afterBtnTxt}>📷 Pick AFTER Photo</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (!info) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f4f1f0",
        }}
      >
        <ActivityIndicator size="large" color="#1a6b3c" />
        <Text style={{ marginTop: 10, color: "#666" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={ms.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a6b3c" />

      <View style={ms.header}>
        <TouchableOpacity
          style={ms.menuBtn}
          onPress={() => navigation.openDrawer()}
        >
          <Text style={{ fontSize: 28, color: "#fff" }}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={ms.headerTitle}>🖼 Pick From Gallery</Text>
          {/* <Text style={ms.headerSub}>{info.tag}</Text> */}
        </View>
      </View>

      {selectMode && (
        <View style={ms.selToolbar}>
          <TouchableOpacity
            style={[ms.toolbarBtn, ms.toolbarBtnPrimary]}
            onPress={selectAll}
          >
            <Text style={ms.toolbarBtnText}>Select All</Text>
          </TouchableOpacity>
          <Text style={ms.toolbarCounter}>{selected.size} selected</Text>
          <TouchableOpacity
            style={[ms.toolbarBtn, ms.toolbarBtnDanger]}
            onPress={deleteSelected}
          >
            <Text style={ms.toolbarBtnText}>❌ Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ms.toolbarBtn, ms.toolbarBtnDanger]}
            onPress={clearSel}
          >
            <Text style={ms.toolbarBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {cards.length === 0 ? (
        <View style={ms.empty}>
          <Text style={ms.emptyTxt}>
            No gallery records yet.{"\n"}Press 🖼 GALLERY to start.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={renderCard}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: responsiveSize(80),
          }}
        />
      )}

      {loading && (
        <View style={ms.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 8 }}>Processing…</Text>
        </View>
      )}

      <FullScreenModal
        visible={!!fullScreenCard}
        card={fullScreenCard}
        info={info}
        showCouncilDetails={showCouncilDetails}
        sameTagForAll={sameTagForAll}
        onClose={() => setFullScreenCard(null)}
      />

      <View
        style={[ms.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}
      >
        <TouchableOpacity style={ms.btnGallery} onPress={pickBefore}>
          <Text style={ms.btnTxt}>🖼 GALLERY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={ms.btnShare}
          onPress={() => {
            if (!selectMode) {
              setSelectMode(true);
              setSelected(new Set());
            } else shareSelected();
          }}
        >
          <Text style={ms.btnTxt}>{selectMode ? "SHARE NOW" : "SELECT"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// â”€â”€â”€ Composite Card View (used for sharing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Renders a landscape before/after card with stamp
const CompositeCard = React.forwardRef(
  ({ card, info, showCouncilDetails = true, sameTagForAll = true }, ref) => {
    const beforeMeta = card.beforeMetadata
      ? `${formatDate(card.beforeMetadata.timestamp)}   ${card.beforeMetadata.gps}`
      : `${formatDate(card.createdAt)}   ${card.gps || "GPS unavailable"}`;
    const afterMeta = card.afterMetadata
      ? `${formatDate(card.afterMetadata.timestamp)}   ${card.afterMetadata.gps}`
      : "";
    const location = sameTagForAll ? info.tag || "" : card.tag || "";

    return (
      <View ref={ref} style={sc.wrap}>
        {/* Images row */}
        <View style={sc.imgRow}>
          {/* Before */}
          <View style={sc.half}>
            {card.beforeUri ? (
              <View style={{ flex: 1 }}>
                <Image
                  source={{ uri: card.beforeUri }}
                  style={sc.img}
                  resizeMode="cover"
                />
                {card.beforeMetadata && (
                  <View style={sc.metaOverlay}>
                    <Text
                      style={sc.metaText}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                    >
                      {beforeMeta}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[sc.img, sc.placeholder]}>
                <Text style={sc.phTxt}>No Image</Text>
              </View>
            )}
            <View
              style={[
                sc.labelWrap,
                {
                  backgroundColor: "#0000003b",
                },
              ]}
            >
              <Text style={sc.label}>BEFORE</Text>
            </View>
          </View>
          {/* After */}
          <View style={sc.half}>
            {card.afterUri ? (
              <View style={{ flex: 1 }}>
                <Image
                  source={{ uri: card.afterUri }}
                  style={sc.img}
                  resizeMode="cover"
                />
                {card.afterMetadata && (
                  <View style={sc.metaOverlay}>
                    <Text
                      style={sc.metaText}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                    >
                      {afterMeta}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={[sc.img, sc.placeholder]}>
                <Text style={sc.phTxt}>
                  Pending{"\n"}
                  {"\n"}press 📷 Take after Photo below for after photo
                </Text>
              </View>
            )}
            <View
              style={[
                sc.labelWrap,
                {
                  backgroundColor: "#0000003b",
                },
              ]}
            >
              <Text style={sc.label}>AFTER</Text>
            </View>
          </View>
        </View>
        {/* Location strip */}
        {showCouncilDetails && location.length > 0 && (
          <View style={sc.strip}>
            <Text style={sc.locTxt}>{location}</Text>
          </View>
        )}
      </View>
    );
  },
);

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MainScreen({
  info: initialInfo,
  navigation,
  showCouncilDetails,
  sameTagForAll,
}) {
  const [info, setInfo] = useState(initialInfo);
  const [cards, setCards] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [fullScreenCard, setFullScreenCard] = useState(null);
  const cardRefs = useRef({});
  const previousTags = useRef({});
  const insets = useSafeAreaInsets();
  const [lastLocation, setLastLocation] = useState(null);

  // Sync local info state with prop changes from Settings
  useEffect(() => {
    setInfo(initialInfo);
  }, [initialInfo]);

  // Load saved cards
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(CARDS_KEY);
      if (raw) setCards(JSON.parse(raw));
    })();
  }, []);

  const persist = async (updated) => {
    setCards(updated);
    await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(updated));
  };

  // Take BEFORE photo â†’ create new card
  const takeBefore = async () => {
    // Check GPS permission first
    let { status: locationStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (locationStatus !== "granted") {
      // Show alert and ask user to grant permission
      Alert.alert(
        "GPS Required",
        "GPS permission is required to capture photos. Without GPS coordinates, images cannot be captured.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Grant Permission",
            onPress: async () => {
              const { status: retryStatus } =
                await Location.requestForegroundPermissionsAsync();
              if (retryStatus === "granted") {
                // Permission granted, retry taking photo
                takeBefore();
              } else {
                // Open device settings
                Linking.openSettings();
              }
            },
          },
        ],
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({ quality: 1.0 });
    if (res.canceled) return;

    setLoading(true);
    const timestamp = new Date().toISOString();
    const locationData = await getLocation();

    // Validate location before proceeding
    if (!(await validateLocation(locationData, lastLocation))) {
      setLoading(false);
      return;
    }

    setLastLocation(locationData);
    const gps = locationData.coords;

    // Process image with metadata overlay
    const processedUri = await addMetadataToImage(
      res.assets[0].uri,
      timestamp,
      gps,
    );

    const newCard = {
      id: Date.now().toString(),
      beforeUri: processedUri,
      beforeMetadata: { timestamp, gps },
      afterUri: null,
      afterMetadata: null,
      createdAt: timestamp,
      gps, // Keep for backward compatibility
      tag: "",
    };
    await persist([...cards, newCard]);
    setLoading(false);
  };

  // Take AFTER photo for a card
  const takeAfter = async (cardId) => {
    // Check GPS permission first
    let { status: locationStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (locationStatus !== "granted") {
      // Show alert and ask user to grant permission
      Alert.alert(
        "GPS Required",
        "GPS permission is required to capture photos. Without GPS coordinates, images cannot be captured.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Grant Permission",
            onPress: async () => {
              const { status: retryStatus } =
                await Location.requestForegroundPermissionsAsync();
              if (retryStatus === "granted") {
                // Permission granted, retry taking photo
                takeAfter(cardId);
              } else {
                // Open device settings
                Linking.openSettings();
              }
            },
          },
        ],
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({ quality: 1.0 });
    if (res.canceled) return;

    setLoading(true);
    const timestamp = new Date().toISOString();
    const locationData = await getLocation();

    // Validate location before proceeding
    if (!(await validateLocation(locationData, lastLocation))) {
      setLoading(false);
      return;
    }

    setLastLocation(locationData);
    const gps = locationData.coords;

    // Process image with metadata overlay
    const processedUri = await addMetadataToImage(
      res.assets[0].uri,
      timestamp,
      gps,
    );

    const updated = cards.map((c) =>
      c.id === cardId
        ? {
            ...c,
            afterUri: processedUri,
            afterMetadata: { timestamp, gps },
          }
        : c,
    );
    await persist(updated);
    setLoading(false);
  };

  // Toggle card selection
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(cards.map((c) => c.id)));
  const clearSel = () => {
    setSelected(new Set());
    setSelectMode(false);
  };

  // Encode card as JPG after both images are present
  const encodeCard = async (cardId) => {
    const ref = cardRefs.current[cardId];
    if (!ref) return;

    try {
      const uri = await captureRef(ref, { format: "jpg", quality: 0.95 });
      const encodedUri = `file://${uri}`;

      const updated = cards.map((c) =>
        c.id === cardId ? { ...c, encodedUri } : c,
      );
      await persist(updated);
    } catch (error) {
      console.log("Card encoding failed:", error);
    }
  };

  // Auto-encode cards when both images are present or tag changes
  useEffect(() => {
    cards.forEach((card) => {
      if (card.beforeUri && card.afterUri) {
        const previousTag = previousTags.current[card.id];
        const currentTag = card.tag || "";

        // Encode if: 1) No encodedUri yet, or 2) Tag has changed
        if (
          !card.encodedUri ||
          (card.encodedUri && previousTag !== currentTag)
        ) {
          // Delay encoding slightly to ensure card is rendered
          setTimeout(() => encodeCard(card.id), 300);
        }

        // Update previous tag
        previousTags.current[card.id] = currentTag;
      }
    });
  }, [cards]);

  // Share selected cards as images
  const shareSelected = async () => {
    if (selected.size === 0) {
      Alert.alert("None selected", "Please select at least one card to share.");
      return;
    }
    setLoading(true);
    try {
      // Capture all selected cards in parallel
      const uris = await Promise.all(
        [...selected].map(async (id) => {
          const ref = cardRefs.current[id];
          if (!ref) return null;
          // Use encodedUri if available, otherwise capture on demand
          const card = cards.find((c) => c.id === id);
          if (card?.encodedUri) {
            return card.encodedUri;
          }
          const uri = await captureRef(ref, { format: "jpg", quality: 0.95 });
          return `file://${uri}`;
        }),
      );
      const sharedUris = uris.filter(Boolean);
      if (sharedUris.length === 0) {
        setLoading(false);
        return;
      }

      // Try WhatsApp share first, fallback to general share
      try {
        await Share.shareSingle({
          urls: sharedUris,
          social: Share.Social.WHATSAPP,
          type: "image/jpeg",
        });
      } catch (whatsappError) {
        // WhatsApp not available or user canceled, try general share
        await Share.open({
          urls: sharedUris,
          type: "image/jpeg",
        });
      }

      setLoading(false);
      clearSel();
      Alert.alert("Success", "Images shared successfully.");
    } catch (e) {
      // User dismissing the sheet throws â€” ignore it
      if (e?.message !== "User did not share" && e?.error !== "User canceled") {
        Alert.alert("Share failed", e.message ?? "Could not share the cards.");
      }
      setLoading(false);
      clearSel();
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) {
      Alert.alert(
        "None selected",
        "Please select at least one card to delete.",
      );
      return;
    }

    Alert.alert(
      "Delete Cards",
      `How would you like to delete ${selected.size} card(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Without Saving",
          style: "destructive",
          onPress: async () => {
            const updated = cards.filter((c) => !selected.has(c.id));
            await persist(updated);
            clearSel();
            Alert.alert("Success", "Cards deleted from app.");
          },
        },
        {
          text: "Save & Delete",
          onPress: async () => {
            setLoading(true);
            try {
              // Capture all selected cards
              const uris = await Promise.all(
                [...selected].map(async (id) => {
                  const ref = cardRefs.current[id];
                  if (!ref) return null;
                  const uri = await captureRef(ref, {
                    format: "jpg",
                    quality: 0.95,
                  });
                  return `file://${uri}`;
                }),
              );
              const capturedUris = uris.filter(Boolean);

              if (capturedUris.length === 0) {
                setLoading(false);
                Alert.alert("Error", "Could not capture images.");
                return;
              }

              // Request media library permissions
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status !== "granted") {
                setLoading(false);
                Alert.alert(
                  "Permission needed",
                  "Gallery access is required to save images.",
                );
                return;
              }

              // Save all images to gallery
              for (const uri of capturedUris) {
                const cleanUri = uri.replace("file://", "");
                await MediaLibrary.saveToLibraryAsync(cleanUri);
              }

              // Delete from app
              const updated = cards.filter((c) => !selected.has(c.id));
              await persist(updated);
              setLoading(false);
              clearSel();
              Alert.alert(
                "Success",
                `${capturedUris.length} image(s) saved to gallery and deleted from app.`,
              );
            } catch (error) {
              setLoading(false);
              Alert.alert(
                "Error",
                error.message ?? "Could not save images to gallery.",
              );
            }
          },
        },
      ],
    );
  };

  // Full Screen Modal Component
  const FullScreenModal = ({
    visible,
    card,
    info,
    showCouncilDetails,
    sameTagForAll,
    onClose,
  }) => {
    if (!card) return null;

    const beforeMeta = card.beforeMetadata
      ? `${formatDate(card.beforeMetadata.timestamp)}   ${card.beforeMetadata.gps}`
      : `${formatDate(card.createdAt)}   ${card.gps || "GPS unavailable"}`;
    const afterMeta = card.afterMetadata
      ? `${formatDate(card.afterMetadata.timestamp)}   ${card.afterMetadata.gps}`
      : "";
    const location = sameTagForAll ? info?.tag || "" : card.tag || "";

    // If card has been encoded, show the encoded image with zoom/pan
    if (card.encodedUri) {
      const imageUrl = [{ url: card.encodedUri }];

      return (
        <Modal
          visible={visible}
          transparent={false}
          animationType="fade"
          onRequestClose={onClose}
        >
          <View style={{ flex: 1, backgroundColor: "#000" }}>
            <TouchableOpacity
              style={[ms.fullScreenClose, { zIndex: 1000 }]}
              onPress={onClose}
            >
              <Text style={ms.fullScreenCloseTxt}>✕</Text>
            </TouchableOpacity>

            <ImageViewer
              imageUrls={imageUrl}
              enableSwipeDown
              onSwipeDown={onClose}
              backgroundColor="#000"
              renderIndicator={() => null}
              enablePreload
              saveToLocalByLongPress={false}
            />

            {showCouncilDetails && location.length > 0 && (
              <View
                style={[
                  ms.fullScreenTag,
                  { position: "absolute", bottom: 40, left: 20, right: 20 },
                ]}
              >
                <Text style={ms.fullScreenTagText}>{location}</Text>
              </View>
            )}
          </View>
        </Modal>
      );
    }

    // Fallback: Show before/after images side by side (while encoding or if encoding failed)
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
        onRequestClose={onClose}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <TouchableOpacity style={ms.fullScreenClose} onPress={onClose}>
            <Text style={ms.fullScreenCloseTxt}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              padding: 20,
            }}
          >
            {/* Before and After Images Side by Side */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {/* BEFORE */}
              <View style={{ flex: 1 }}>
                <Text style={[ms.fullScreenLabel, { textAlign: "center" }]}>
                  BEFORE
                </Text>
                {card.beforeUri ? (
                  <View>
                    <Image
                      source={{ uri: card.beforeUri }}
                      style={{
                        width: "100%",
                        height: SCREEN_HEIGHT * 0.5,
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                    {card.beforeMetadata && (
                      <View style={[ms.fullScreenMeta, { marginTop: 8 }]}>
                        <Text style={ms.fullScreenMetaText}>{beforeMeta}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: SCREEN_HEIGHT * 0.5,
                      backgroundColor: "#222",
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#666", fontSize: 14 }}>
                      No Image
                    </Text>
                  </View>
                )}
              </View>

              {/* AFTER */}
              <View style={{ flex: 1 }}>
                <Text style={[ms.fullScreenLabel, { textAlign: "center" }]}>
                  AFTER
                </Text>
                {card.afterUri ? (
                  <View>
                    <Image
                      source={{ uri: card.afterUri }}
                      style={{
                        width: "100%",
                        height: SCREEN_HEIGHT * 0.5,
                        borderRadius: 8,
                      }}
                      resizeMode="cover"
                    />
                    {card.afterMetadata && (
                      <View style={[ms.fullScreenMeta, { marginTop: 8 }]}>
                        <Text style={ms.fullScreenMetaText}>{afterMeta}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: SCREEN_HEIGHT * 0.5,
                      backgroundColor: "#222",
                      borderRadius: 8,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#666", fontSize: 14 }}>Pending</Text>
                  </View>
                )}
              </View>
            </View>

            {showCouncilDetails && location.length > 0 && (
              <View style={ms.fullScreenTag}>
                <Text style={ms.fullScreenTagText}>{location}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Card list item
  const renderCard = ({ item }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        activeOpacity={selectMode ? 0.7 : 1}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          } else if (item.beforeUri && item.afterUri) {
            setFullScreenCard(item);
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            setSelected(new Set([item.id]));
          }
        }}
        style={[ms.cardWrap, isSelected && ms.cardSelected]}
      >
        {/* Selection checkbox */}
        {selectMode && (
          <View style={ms.checkbox}>
            <Text
              style={{ color: isSelected ? "#1a6b3c" : "#ccc", fontSize: 22 }}
            >
              {isSelected ? "✔" : "☐"}
            </Text>
          </View>
        )}

        {/* Composite card (also used as capture target for sharing) */}
        <CompositeCard
          ref={(el) => {
            if (el) cardRefs.current[item.id] = el;
          }}
          card={item}
          info={info}
          showCouncilDetails={showCouncilDetails}
          sameTagForAll={sameTagForAll}
        />

        {/* Per-card tag input when same-tag mode is off AND tag display is on */}
        {!sameTagForAll && !selectMode && showCouncilDetails && (
          <PerCardTagInput
            cardId={item.id}
            initialTag={item.tag || ""}
            onSave={(newTag) => {
              const updated = cards.map((c) =>
                c.id === item.id ? { ...c, tag: newTag } : c,
              );
              persist(updated);
            }}
          />
        )}

        {/* After camera button overlay (only if no after photo yet) */}
        {!item.afterUri && !selectMode && (
          <TouchableOpacity
            style={ms.afterBtn}
            onPress={() => takeAfter(item.id)}
          >
            <Text style={ms.afterBtnTxt}>📷 Take AFTER Photo</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={ms.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a6b3c" />

      {/* Header */}
      <View style={ms.header}>
        <TouchableOpacity
          style={ms.menuBtn}
          onPress={() => navigation.openDrawer()}
        >
          <Text style={{ fontSize: 28, color: "#fff" }}>☰</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={ms.headerTitle}>{"📸 Capture through camera"}</Text>
        </View>
      </View>

      {/* Select mode toolbar */}
      {selectMode && (
        <View style={ms.selToolbar}>
          <TouchableOpacity
            style={[ms.toolbarBtn, ms.toolbarBtnPrimary]}
            onPress={selectAll}
          >
            <Text style={ms.toolbarBtnText}>Select All</Text>
          </TouchableOpacity>
          <Text style={ms.toolbarCounter}>{selected.size} selected</Text>
          <TouchableOpacity
            style={[ms.toolbarBtn, ms.toolbarBtnDanger]}
            onPress={deleteSelected}
          >
            <Text style={ms.toolbarBtnText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ms.toolbarBtn, ms.toolbarBtnDanger]}
            onPress={clearSel}
          >
            <Text style={ms.toolbarBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Card list */}
      {cards.length === 0 ? (
        <View style={ms.empty}>
          <Text style={ms.emptyTxt}>
            No work records yet.{"\n"}Press 📸Before to start.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={cards}
          keyExtractor={(c) => c.id}
          renderItem={renderCard}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: responsiveSize(80),
          }}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <View style={ms.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", marginTop: 8 }}>Processing…</Text>
        </View>
      )}

      <FullScreenModal
        visible={!!fullScreenCard}
        card={fullScreenCard}
        info={info}
        showCouncilDetails={showCouncilDetails}
        sameTagForAll={sameTagForAll}
        onClose={() => setFullScreenCard(null)}
      />

      {/* Bottom buttons */}
      <View
        style={[ms.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}
      >
        <TouchableOpacity style={ms.btnBefore} onPress={takeBefore}>
          <Text style={ms.btnTxt}>📸 BEFORE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={ms.btnShare}
          onPress={() => {
            if (!selectMode) {
              setSelectMode(true);
              setSelected(new Set());
            } else shareSelected();
          }}
        >
          <Text style={ms.btnTxt}>
            {selectMode ? "📤 SHARE NOW" : "SELECT"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// â”€â”€â”€ Drawer Navigator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DrawerNavigator({
  info,
  setInfo,
  showCouncilDetails,
  setShowCouncilDetails,
  sameTagForAll,
  setSameTagForAll,
}) {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Home"
        screenOptions={{
          drawerStyle: {
            backgroundColor: "#e8f5e9",
            width: 280,
            paddingTop: 30,
          },
          drawerActiveTintColor: "#1a6b3c",
          drawerInactiveTintColor: "#666",
          drawerLabelStyle: {
            fontSize: responsiveFontSize(16),
            fontWeight: "600",
          },
          headerShown: false,
          drawerItemStyle: {
            borderBottomWidth: 1,
            borderBottomColor: "#c5e1c5",
            marginVertical: 0,
            paddingVertical: 1,
          },
        }}
      >
        <Drawer.Screen
          name="Home"
          options={{
            drawerLabel: "📷 Capture through Camera",
            title: "Capture Images",
          }}
        >
          {(props) => (
            <MainScreen
              {...props}
              info={info}
              showCouncilDetails={showCouncilDetails}
              sameTagForAll={sameTagForAll}
            />
          )}
        </Drawer.Screen>
        <Drawer.Screen
          name="GalleryWork"
          options={{
            drawerLabel: "🖼️ Pick From Gallery",
            title: "Pick Images",
          }}
        >
          {(props) => (
            <GalleryWorkScreen
              {...props}
              showCouncilDetails={showCouncilDetails}
              sameTagForAll={sameTagForAll}
            />
          )}
        </Drawer.Screen>
        <Drawer.Screen
          name="Settings"
          options={{
            drawerLabel: "⚙️ Settings",
            title: "Settings",
          }}
          initialParams={{
            info,
            onSave: setInfo,
            showCouncilDetails,
            setShowCouncilDetails,
            sameTagForAll,
            setSameTagForAll,
          }}
        >
          {(props) => <SettingsScreen {...props} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Credits"
          component={CreditsScreen}
          options={{
            drawerLabel: "📝 Credits",
            title: "Credits",
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

// â”€â”€â”€ Root App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function App() {
  const [info, setInfo] = useState(null);
  const [ready, setReady] = useState(false);
  const [showCouncilDetails, setShowCouncilDetails] = useState(true);
  const [sameTagForAll, setSameTagForAll] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(COUNCIL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Auto-migrate old format { council, tehsil, district } to { tag }
        if (parsed.council || parsed.tehsil || parsed.district) {
          const migrated = {
            tag: [parsed.council, parsed.tehsil, parsed.district]
              .filter(Boolean)
              .join(" | "),
          };
          await AsyncStorage.setItem(COUNCIL_KEY, JSON.stringify(migrated));
          setInfo(migrated);
        } else {
          setInfo(parsed);
        }
      }

      const showRaw = await AsyncStorage.getItem(SHOW_COUNCIL_KEY);
      if (showRaw !== null) setShowCouncilDetails(JSON.parse(showRaw));

      const sameRaw = await AsyncStorage.getItem(SAME_TAG_KEY);
      if (sameRaw !== null) setSameTagForAll(JSON.parse(sameRaw));

      setReady(true);
    })();
  }, []);

  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#1a6b3c",
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

  return (
    <SafeAreaProvider>
      {info ? (
        <DrawerNavigator
          info={info}
          setInfo={setInfo}
          showCouncilDetails={showCouncilDetails}
          setShowCouncilDetails={setShowCouncilDetails}
          sameTagForAll={sameTagForAll}
          setSameTagForAll={setSameTagForAll}
        />
      ) : (
        <SetupScreen onSave={setInfo} />
      )}
    </SafeAreaProvider>
  );
}

registerRootComponent(App);

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const s = StyleSheet.create({
  setupContainer: {
    flex: 1,
    backgroundColor: "#1a6b3c",
  },
  setupCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: responsiveSize(24),
    marginHorizontal: responsiveSize(20),
    maxWidth: 500,
    alignSelf: "center",
    width: "100%",
    elevation: 6,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a6b3c",
    textAlign: "center",
    marginBottom: 6,
  },
  setupSub: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: "#222",
  },
  saveBtn: {
    backgroundColor: "#1a6b3c",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
  },
  saveBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    elevation: 10,
  },
  creditsHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a6b3c",
  },
  creditsText: {
    fontSize: 14,
    color: "#333",
    marginTop: 8,
    lineHeight: 20,
  },
});

const sc = StyleSheet.create({
  wrap: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    overflow: "hidden",
    margin: 0,
    padding: 0,
  },
  imgRow: { flexDirection: "row", height: responsiveSize(200), gap: 2 },
  half: { flex: 1, position: "relative" },
  img: { width: "100%", height: "100%" },
  placeholder: {
    backgroundColor: "#383737",
    justifyContent: "center",
    alignItems: "center",
  },
  phTxt: {
    color: "#d5cbcb",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  labelWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    paddingVertical: 0, //changed from 3 to 1 saad
    alignItems: "center",
  },
  label: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 2,
    textShadowColor: "#000", // Added shadow for sharpness
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  metaOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.60)",
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  metaText: {
    color: "#fff",
    fontSize: responsiveFontSize(9),
    fontWeight: "600",
    textShadowColor: "#000", // Added shadow for sharpness
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  strip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  locTxt: {
    color: "#000000",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});

const ms = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f1f0" },
  header: {
    backgroundColor: "#1a6b3c",
    paddingTop: 24,
    paddingLeft: 14,
    paddingRight: 14,
    paddingBottom: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  headerSub: { color: "#bad1c6", fontSize: 13, marginTop: 2 },
  menuBtn: {
    padding: 8,
    marginRight: 8,
  },
  selToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 5,
    gap: 10,
  },
  toolbarBtn: {
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbarBtnPrimary: {
    backgroundColor: "#6b1a40",
  },
  toolbarBtnDanger: {
    backgroundColor: "rgb(191, 26, 26)",
  },
  toolbarBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  toolbarCounter: {
    color: "#666",
    fontWeight: "600",
    fontSize: 14,
    alignSelf: "center",
  },
  cardWrap: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: "hidden",
    elevation: 3,
    backgroundColor: "#187c08",
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: "#1a6b3c" },
  checkbox: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 4,
    padding: 2,
    elevation: 4,
  },
  afterBtn: { backgroundColor: "#1a6b3c", padding: 10, alignItems: "center" },
  afterBtnTxt: { color: "#fff", fontWeight: "600", fontSize: 14 },
  tagInputWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tagInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: "#222",
  },
  tagSaveBtn: {
    backgroundColor: "#1a6b3c",
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
    marginTop: 6,
  },
  tagSaveBtnTxt: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  tagEditBtn: {
    backgroundColor: "#FF9800",
    borderRadius: 6,
    padding: 10,
    alignItems: "center",
    marginTop: 6,
  },
  tagEditBtnTxt: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTxt: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 26,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#dddddd",
    padding: 2,
    gap: 10,
  },
  btnBefore: {
    //flex: 1,
    width: "50%",
    height: 50,
    backgroundColor: "#0e5692",
    borderRadius: 10,
    borderColor: "#1a6b3c",
    borderWidth: 3,
    justifyContent: "center", //added by saad
    //padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  btnGallery: {
    width: "50%",
    height: 50,
    backgroundColor: "#0e5692",
    borderRadius: 10,
    justifyContent: "center", //added by saad
    //padding: 14,
    alignItems: "center",
    borderColor: "#1a6b3c",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  btnShare: {
    flex: 1,
    height: 50,
    backgroundColor: "#1a6b3c",
    borderRadius: 10,
    borderColor: "#0e5692",
    borderWidth: 3,
    //padding: 14,
    justifyContent: "center", //added by saad
    alignItems: "center",
  },
  btnTxt: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,

    textShadowColor: "#000",
    textShadowOffset: { width: 0.5, height: 1 },
    textShadowRadius: 1,
  },
});

// â”€â”€â”€ Video Card Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const vc = StyleSheet.create({
  wrap: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    overflow: "hidden",
    margin: 0,
    padding: 0,
  },
  videoRow: {
    flexDirection: "row",
    height: responsiveSize(200),
    gap: 2,
  },
  half: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  phTxt: {
    color: "#d5cbcb",
    fontSize: 13,
  },
  labelWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    paddingVertical: 0,
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
    pointerEvents: "none",
  },
  label: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 2,
  },
  metaOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.53)",
    paddingVertical: 0,
    paddingHorizontal: 2,
    zIndex: 10,
    elevation: 10,
    pointerEvents: "none",
  },
  metaText: {
    color: "#fff",
    fontSize: responsiveFontSize(9),
    fontWeight: "600",
  },
  strip: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  locTxt: {
    color: "#000000",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  // Full-screen modal styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullScreenClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenCloseTxt: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  fullScreenScroll: {
    paddingTop: 100,
    paddingBottom: 40,
    paddingHorizontal: 20,
    width: SCREEN_WIDTH,
  },
  fullScreenSection: {
    marginBottom: 40,
    width: SCREEN_WIDTH - 40,
  },
  fullScreenLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 12,
  },
  fullScreenImageWrapper: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.5,
    borderRadius: 12,
    backgroundColor: "#222",
    overflow: "hidden",
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
  fullScreenMeta: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  fullScreenMetaText: {
    color: "#ccc",
    fontSize: 13,
  },
  fullScreenPlaceholder: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.5,
    borderRadius: 12,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenPlaceholderText: {
    color: "#666",
    fontSize: 16,
  },
  fullScreenTag: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "rgba(255,111,0,0.2)",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6F00",
  },
  fullScreenTagText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
