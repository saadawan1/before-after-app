export const saveImages = async (uris: string[]) => {
  uris.forEach((uri, index) => {
    const link = document.createElement("a");
    link.href = uri;
    link.download = `before-after-${index + 1}.jpg`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
  return uris.length;
};
