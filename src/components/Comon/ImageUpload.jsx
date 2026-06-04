import React, { useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/providers/AuthProvider";

const ImageUpload = ({
  setImageUrl = () => {},
  setPreviewImageUrl = () => {},
  setValue = () => {},
  label = "Upload Image",
}) => {
  const handleImageUpload = async (e) => {
    const imageFile = e.target.files[0];
    if (!imageFile) return;
   
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL || "http://localhost:5000";
      const s3BaseUrl = process.env.NEXT_PUBLIC_S3_BASE_URL || "https://mondolagro.s3.ap-southeast-1.amazonaws.com";

      const response = await axios.post(
        `${uploadUrl}/api/get-image-url?pathName=Chayatol`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = response.data;
      const path = `${s3BaseUrl}/${data.path}`;

      if (response.status === 200) {
        if (setImageUrl) {
          setImageUrl(path);
        }
        if (setPreviewImageUrl) {
          setPreviewImageUrl(path);
        }
        if (setValue) {
          setValue("photourl", path);
        }
        toast.success("Image uploaded successfully");
      } else {
        toast.error(data.message || "Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error uploading image");
    }
  };

  return (
    <div className="w-full space-y-2 pt-1">
      <label className="capitalize font-bold text-xs text-brand-dark-grey dark:text-brand-sage">{label}</label>
      <div className="form-control border border-brand-beige/50 dark:border-brand-dark-grey/50 rounded-xl shadow-sm bg-brand-offwhite/50 dark:bg-brand-dark-grey/50 overflow-hidden">
        <input
          onChange={handleImageUpload}
          type="file"
          className="file-input w-full outline-none focus:outline-none bg-transparent text-brand-charcoal dark:text-brand-offwhite border-none p-2 text-sm"
        />
      </div>
    </div>
  );
};

export default ImageUpload;
