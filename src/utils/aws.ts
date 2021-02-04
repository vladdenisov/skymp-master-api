import * as AWS from "aws-sdk";

export interface S3Object {
  fileName: string;
  fileSizeMbytes: number;
  lastModified: Date;
  downloadUrl: string;
}

export class AmazonApi {
  constructor(private accessKeyId?: string, private accessKey?: string) {
    if (typeof accessKey !== "string") {
      throw new Error("Invalid accessKey - " + typeof accessKey);
    }
    if (typeof accessKeyId !== "string") {
      throw new Error("Invalid accessKeyId - " + typeof accessKeyId);
    }

    AWS.config.update({
      region: this.region,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.accessKey
    });

    // Create S3 service object
    this.s3 = new AWS.S3({ apiVersion: "2006-03-01" });
  }

  async listObjects(bucket: string): Promise<S3Object[]> {
    // Create the parameters for calling listObjects
    const bucketParams = {
      Bucket: bucket
    };

    const bucketRegion =
      "skyrim-platform-builds" === bucket ? "eu-west-2" : "eu-west-3";

    // Call S3 to obtain a list of the objects in the bucket
    const resUnsorted: S3Object[] = await new Promise((resolve, reject) => {
      this.s3.listObjects(bucketParams, (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Contents) {
            resolve(
              data.Contents.map((object) => {
                return {
                  fileName: object.Key ? object.Key : "",
                  fileSizeMbytes: object.Size
                    ? Math.ceil((object.Size / 1024 / 1024) * 10) / 10
                    : 0,
                  lastModified: object.LastModified
                    ? object.LastModified
                    : new Date(),
                  downloadUrl: `https://${bucket}.s3.${bucketRegion}.amazonaws.com/${object.Key}`
                };
              })
            );
          }
        }
      });
    });
    return resUnsorted.sort((a, b) => {
      if (+a.lastModified > +b.lastModified) return -1;
      if (+a.lastModified < +b.lastModified) return 1;
      return 0;
    });
  }

  private s3: AWS.S3;
  private region = "eu-west-2";
}
