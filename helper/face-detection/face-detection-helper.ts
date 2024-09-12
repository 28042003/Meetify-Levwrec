// Helper to extract face coordinates from MediaPipe results
export const extractFaceCoordinates = (result: any) => {
  const landmarks = result.detections[0].landmarks;
  const faceCoordinates = {
    leftEye: landmarks.find((landmark: any) => landmark.name === 'left_eye'),
    rightEye: landmarks.find((landmark: any) => landmark.name === 'right_eye'),
    // Add other facial landmarks if needed
  };
  return faceCoordinates;
};

// Helper to detect if user is cheating by looking away
export const detectCheating = (faceCoordinates: any, debug = false) => {
  const { leftEye, rightEye } = faceCoordinates;

  if (!leftEye || !rightEye) {
    if (debug) {
      console.log('Left or right eye not detected.');
    }
    return [false, false]; // No reliable data available
  }

  const lookingLeft = leftEye.x < rightEye.x - 0.1; // Adjust threshold based on your requirements
  const lookingRight = rightEye.x > leftEye.x + 0.1; // Adjust threshold based on your requirements

  if (debug) {
    console.log('Left Eye:', leftEye);
    console.log('Right Eye:', rightEye);
    console.log('Looking Left:', lookingLeft);
    console.log('Looking Right:', lookingRight);
  }

  return [lookingLeft, lookingRight];
};

// Helper to determine cheating status based on eye position
export const getCheatingStatus = (
  lookingLeft: boolean,
  lookingRight: boolean,
) => {
  if (lookingLeft && lookingRight) {
    return 'Looking in multiple directions - possible cheating';
  }
  if (lookingLeft) {
    return 'Looking left - possible cheating';
  }
  if (lookingRight) {
    return 'Looking right - possible cheating';
  }
  return 'Face detected';
};
