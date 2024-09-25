export type JobToMlEntityRequest = {
  object: string;
  cam_id: string;
  use_cases: string[];
  callback: string;
};

export type JobToMlEntity = {
  job_id: string;
  object: string; //presigned url
  cam_id: string;
  use_cases: string[];
  timestamp: string;
  callback: string;
};

export type BoundingBox = [number, number, number, number];

export type ImageInfo = {
  sort_index: [string, number, string];
  src: string | null;
  cam_id: string;
  frame: number;
  timestamp: string;
  image_id: string;
  shape: number[] | null;
  dtype: string | null;
};

export type Detection = {
  sort_index: [string, number, string];
  bb: BoundingBox[];
  conf: number[];
  cls: string[];
  image_id: string;
  image: ImageInfo;
  image_shape: [number, number, number];
};

export type TTrackObject = {
  objectId: string | null;
  bbox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  conf: number;
};

export type TVideoFrame = {
  frameId: number;
  objectList: TTrackObject[];
};
