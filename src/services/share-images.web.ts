export const shareImages = async (urls: string[]) => {
  if (!navigator.share || typeof File === "undefined") {
    throw new Error("Image sharing is not supported by this browser.");
  }

  const files = await Promise.all(
    urls.map(async (url, index) => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], `before-after-${index + 1}.jpg`, {
        type: "image/jpeg",
      });
    }),
  );

  if (navigator.canShare && !navigator.canShare({ files })) {
    throw new Error("This browser cannot share the selected images.");
  }

  await navigator.share({ files, title: "Before and After" });
};
