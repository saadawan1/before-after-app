import Share from "react-native-share";

export const shareImages = (urls: string[]) =>
  Share.open({ urls, type: "image/jpeg" });
