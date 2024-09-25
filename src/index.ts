import express, { Request, Response } from "express";
import axios from "axios";
import {
  Detection,
  JobToMlEntity,
  JobToMlEntityRequest,
  TVideoFrame,
} from "./type";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();
const PORT = 8090;

const inMemDeviceMap: Map<string, Map<string, Detection[]>> = new Map();

app.use(cors());
app.use(express.json());

app.get("/hello", (req: Request, res: Response) => {
  res.json({
    message: "Hello, world!",
  });
});

app.get("/bbox", (req: Request, res: Response) => {
  const {
    timestamp,
    fps: fpsString,
    deviceId,
    duration: durationString,
  } = req.query;

  if (
    typeof timestamp !== "string" ||
    typeof deviceId !== "string" ||
    typeof fpsString !== "string" ||
    typeof durationString !== "string"
  ) {
    return res.status(400).json({
      message: "invalid input",
    });
  }

  const fps = parseInt(fpsString);
  const duration = parseInt(durationString);

  const formattedDate = new Date(timestamp);
  const formattedTimestamp = formattedDate.toISOString();

  const deviceDetection = inMemDeviceMap.get(deviceId);
  if (!deviceDetection) {
    return res.status(400).json({
      message: "deviceId does not exist.",
    });
  }

  const detectionFrameList = deviceDetection.get(formattedTimestamp) || [];
  if (detectionFrameList.length < fps * duration) {
    return res.status(404).json({
      message: "Frame Buffer less than fps",
    });
  }

  const totalFrames = detectionFrameList.length;
  const frames: TVideoFrame[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const frame: TVideoFrame = {
      frameId: i,
      objectList: [],
    };
    const detectionFrame = detectionFrameList.find((d) => d.image.frame === i);
    if (detectionFrame) {
      for (
        let objectIndex = 0;
        objectIndex < detectionFrame.bb.length;
        objectIndex++
      ) {
        frame.objectList.push({
          objectId: null,
          bbox: {
            x: detectionFrame.bb[objectIndex][0],
            y: detectionFrame.bb[objectIndex][1],
            w:
              detectionFrame.bb[objectIndex][2] -
              detectionFrame.bb[objectIndex][0],
            h:
              detectionFrame.bb[objectIndex][3] -
              detectionFrame.bb[objectIndex][1],
          },
          conf: detectionFrame.conf[objectIndex],
        });
      }
    }
    frames.push(frame);
  }

  res.status(200).json(frames);
});

app.get("/detection", (req: Request, res: Response) => {
  const { timestamp, deviceId } = req.query;

  if (typeof timestamp !== "string" || typeof deviceId !== "string") {
    return res.status(400).json({
      message: "invalid input",
    });
  }

  const formattedDate = new Date(timestamp);
  const formattedTimestamp = formattedDate.toISOString();

  const deviceDetection = inMemDeviceMap.get(deviceId);
  if (!deviceDetection) {
    return res.status(400).json({
      message: "deviceId does not exist.",
    });
  }

  const detectionFrameList = deviceDetection.get(formattedTimestamp) || [];

  const payload = {
    length: detectionFrameList.length,
    data: detectionFrameList,
  };

  if (detectionFrameList.length === 0) {
    return res.status(404).json({
      message: "No detections found for the provided timestamp",
    });
  }

  res.status(200).json(payload);
});

app.post("/detection-receiver-manual", (req: Request, res: Response) => {
  const payload: Detection[] = req.body;
  const updatedDetectionDeviceTimestamp: Set<string> = new Set();
  payload.forEach((d) => {
    const deviceId = d.image.cam_id;
    const formattedDate = new Date(d.image.timestamp);
    const formattedTimestamp = formattedDate.toISOString();
    const device = inMemDeviceMap.get(deviceId);
    if (device) {
      const detectionList = device.get(formattedTimestamp);
      if (detectionList) {
        detectionList.push(d);
      } else {
        device.set(formattedTimestamp, [d]);
      }
    } else {
      const detectionMap = new Map();
      detectionMap.set(formattedTimestamp, [d]);
      inMemDeviceMap.set(deviceId, detectionMap);
    }
    updatedDetectionDeviceTimestamp.add(`${deviceId}||${formattedTimestamp}`);
  });

  const updatedDetections: {
    deviceId: string;
    timestamp: string;
    frameCount: number;
  }[] = [];
  updatedDetectionDeviceTimestamp.forEach((e) => {
    const eList = e.split("||");
    console.log(eList);
    const deviceId = eList[0];
    const formattedTimestamp = eList[1];
    const device = inMemDeviceMap.get(deviceId);
    if (device) {
      const detectionList = device.get(formattedTimestamp);
      if (detectionList) {
        updatedDetections.push({
          deviceId: deviceId,
          frameCount: detectionList.length,
          timestamp: formattedTimestamp,
        });
      }
    }
  });

  const timestamp = new Date().toISOString().split(".")[0] + "Z";
  console.log("detection-receiver manual callback current time:", timestamp);
  updatedDetections.forEach((d) => {
    console.log(d);
  });

  res.status(200).json({ message: "OK" });
});

app.post("/detection-receiver", (req: Request, res: Response) => {
  const payload: Detection[] = req.body;
  const updatedDetectionDeviceTimestamp: Set<string> = new Set();
  payload.forEach((d) => {
    const deviceId = d.image.cam_id;
    const formattedDate = new Date(d.image.timestamp);
    const formattedTimestamp = formattedDate.toISOString();
    const device = inMemDeviceMap.get(deviceId);
    if (device) {
      const detectionList = device.get(formattedTimestamp);
      if (detectionList) {
        detectionList.push(d);
      } else {
        device.set(formattedTimestamp, [d]);
      }
    } else {
      const detectionMap = new Map();
      detectionMap.set(formattedTimestamp, [d]);
      inMemDeviceMap.set(deviceId, detectionMap);
    }
    updatedDetectionDeviceTimestamp.add(`${deviceId}||${formattedTimestamp}`);
  });

  const updatedDetections: {
    deviceId: string;
    timestamp: string;
    frameCount: number;
  }[] = [];
  updatedDetectionDeviceTimestamp.forEach((e) => {
    const eList = e.split("||");
    const deviceId = eList[0];
    const formattedTimestamp = eList[1];
    const device = inMemDeviceMap.get(deviceId);
    if (device) {
      const detectionList = device.get(formattedTimestamp);
      if (detectionList) {
        updatedDetections.push({
          deviceId: deviceId,
          frameCount: detectionList.length,
          timestamp: formattedTimestamp,
        });
      }
    }
  });

  const timestamp = new Date().toISOString().split(".")[0] + "Z";
  console.log("detection-receiver callback current time:", timestamp);
  updatedDetections.forEach((d) => {
    console.log(d);
  });

  res.status(200).json({ message: "OK" });
});

app.post("/send-job-to-ml", async (req: Request, res: Response) => {
  const payload: JobToMlEntityRequest = req.body;
  const timestamp = new Date().toISOString().split(".")[0] + "Z";
  const uuid = uuidv4();
  const newPayload: JobToMlEntity = {
    ...payload,
    timestamp: timestamp,
    job_id: uuid,
  };

  try {
    const response = await axios.post(
      "http://0.0.0.0:8000/yami_no_reteru",
      newPayload
    );

    res.status(response.status).json({
      message: "Payload forwarded successfully!",
      data: response.data,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error("Error forwarding payload:", error);
    if (error instanceof Error) {
      res.status(500).json({
        message: "Error forwarding payload",
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: "Unknown error occurred",
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
