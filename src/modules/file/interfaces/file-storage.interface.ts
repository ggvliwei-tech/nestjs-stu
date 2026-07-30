export interface UploadResult {
  filePath: string;
  url: string;
  saveName: string;
}

export interface FileStorage {
  upload(file: Express.Multer.File, folder?: string): Promise<UploadResult>;
  delete(filePath: string): Promise<boolean>;
}
