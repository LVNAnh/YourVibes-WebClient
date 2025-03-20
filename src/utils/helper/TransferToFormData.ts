import { RcFile } from 'antd/es/upload';
import { UploadFile } from 'antd/es/upload';

export const TransferToFormData = (data: any) => {
  const formData = new FormData();

  for (const key in data) {
    if (data[key] === undefined) {
      continue;
    } else if (Array.isArray(data[key])) {
      data[key].forEach((item: any) => {
        formData.append(key, item as any);
      });
    } else {
      formData.append(key, data[key] as any);
    }
  }
  return formData;
}

interface CustomUploadFile extends UploadFile {
  uri?: string; 
}

export const convertMediaToFiles = async (media: RcFile[]) => {
  const mediaFiles: CustomUploadFile[] = await Promise.all(
    media.map(async (mediaItem, index) => {
      const { name, type } = mediaItem;

      // const fileExtension = type.split('/')[1];
      const fileName = `${name}`;

      const fileReader = new FileReader();
      const file: CustomUploadFile = {
        uid: index.toString(),
        name: fileName,
        type: type,
      };

      return new Promise((resolve) => {
        fileReader.onload = () => {
          const result = fileReader.result;
          if (result !== null) {
            file.uri = result as string;
          }
          resolve(file);
        };
        fileReader.readAsDataURL(mediaItem);
      });
    })
  );
  

  return mediaFiles;
};
export const convertMediaDataToFiles = (media: any[]): any[] => {
  return media.map((item) => {
    const file = new File([], item?.id?.toString() || ""); // Tạo đối tượng File trống
    return {
      uid: item?.id?.toString() || "",
      name: item?.id?.toString() || "",
      status: 'done',
      url: item?.media_url || "",
      originFileObj: file, // Thêm thuộc tính originFileObj
    };
  });
};