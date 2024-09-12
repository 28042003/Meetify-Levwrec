// Helper to extract face coordinates from MediaPipe results
export const extractFaceCoordinates = (result: any) => {
  const landmarks = result.detections[0].landmarks;
  const faceCoordinates = landmarks.map((landmark: any) => ({
    x: landmark.x,
    y: landmark.y,
  }));
  return faceCoordinates;
};

// Helper to detect if user is cheating by looking away
export const detectCheating = (faceCoordinates: any, debug = false) => {
  const leftEye = faceCoordinates[0]; // Example for left eye position
  const rightEye = faceCoordinates[1]; // Example for right eye position

  const lookingLeft = leftEye.x < rightEye.x; // Example logic
  const lookingRight = rightEye.x > leftEye.x; // Example logic

  if (debug) {
    console.log('Left Eye:', leftEye);
    console.log('Right Eye:', rightEye);
  }

  return [lookingLeft, lookingRight];
};

// Helper to determine cheating status based on eye position
export const getCheatingStatus = (
  lookingLeft: boolean,
  lookingRight: boolean,
) => {
  if (lookingLeft) {
    return 'Looking left - possible cheating';
  }
  if (lookingRight) {
    return 'Looking right - possible cheating';
  }
  return 'Face detected, no cheating';
};
