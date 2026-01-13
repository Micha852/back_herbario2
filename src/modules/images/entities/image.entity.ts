import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImageDocument = Image & Document;

@Schema({ collection: 'images', timestamps: true })
export class Image {
  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number; // Size in bytes

  @Prop({ required: true })
  width: number;

  @Prop({ required: true })
  height: number;

  @Prop({ required: true })
  format: string; // webp, jpg, png

  @Prop()
  specimenId?: string;

  @Prop({ required: true })
  uploadedBy: string;

  @Prop({ type: Object })
  versions: {
    original: ImageVersion;
    thumbnail?: ImageVersion;
    medium?: ImageVersion;
    large?: ImageVersion;
  };

  @Prop({ default: true })
  isActive: boolean;
}

export interface ImageVersion {
  path: string; // Relative path in uploads folder
  url: string; // Full URL to access
  size: number; // File size in bytes
  width: number;
  height: number;
}

export const ImageSchema = SchemaFactory.createForClass(Image);
