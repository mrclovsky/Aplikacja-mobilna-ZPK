import React from "react";
import { Overlay } from "react-native-maps";

const overlayImagesZPK = [
  require("../../../assets/new_maps/ZPK_1.png"),
  require("../../../assets/new_maps/ZPK_2.png"),
  require("../../../assets/new_maps/ZPK_3.png"),
  require("../../../assets/new_maps/ZPK_4.png"),
  require("../../../assets/new_maps/ZPK_5.png"),
];

const SHARED_BOUNDS: [[number, number], [number, number]] = [
  [54.497969938, 18.454245269], // SW
  [54.538652118, 18.514219777], // NE
];

interface MapOverlayLayerProps {
  overlayIndex: number;
}

export default function MapOverlayLayer({ overlayIndex }: MapOverlayLayerProps) {
  if (overlayIndex === 0) return null;

  const currentIndex = overlayIndex - 1;

  return (
    <>
      <Overlay
      bounds={SHARED_BOUNDS}
      image={overlayImagesZPK[currentIndex]}
      tappable={false}
    />
    </>
  );
}