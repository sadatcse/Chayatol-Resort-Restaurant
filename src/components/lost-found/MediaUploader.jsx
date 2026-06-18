import React, { useState } from "react";
import axios from "axios";
import { FiUploadCloud, FiTrash2, FiFile, FiEye, FiX } from "react-icons/fi";
import { toast } from "react-toastify";

const MediaUploader = ({
  images = [],
  setImages = () => {},
  video = "",
  setVideo = () => {},
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [activePreview, setActivePreview] = useState(null);

  const handleFileUpload = async (e, type) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const toastId = toast.loading(`Uploading file(s)...`);

    try {
      if (type === "images") {
        const uploadedUrls = [...images];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const formData = new FormData();
          formData.append("file", file);

          const { data } = await axios.post("/api/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (data?.url) {
            uploadedUrls.push(data.url);
          }
        }
        setImages(uploadedUrls);
        toast.update(toastId, {
          render: "Images uploaded successfully!",
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
      } else if (type === "video") {
        const file = files[0];
        const formData = new FormData();
        formData.append("file", file);

        const { data } = await axios.post("/api/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (data?.url) {
          setVideo(data.url);
          toast.update(toastId, {
            render: "Video uploaded successfully!",
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.update(toastId, {
        render: "Upload failed. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const removeVideo = () => {
    setVideo("");
  };

  return (
    <div className="space-y-6">
      {/* Images Upload */}
      <div className="space-y-2">
        <label className="capitalize font-bold text-xs text-brand-dark-grey dark:text-brand-sage block">
          Upload Images (Multiple)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative aspect-square rounded-2xl overflow-hidden border border-brand-beige dark:border-brand-dark-grey/50 bg-brand-offwhite group shadow-sm"
            >
              <img
                src={url}
                alt={`Uploaded ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-opacity duration-200">
                <button
                  type="button"
                  onClick={() => setActivePreview(url)}
                  className="btn btn-circle btn-xs btn-neutral text-white hover:bg-neutral/80"
                >
                  <FiEye size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="btn btn-circle btn-xs btn-error text-white hover:bg-error/85"
                >
                  <FiTrash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-brand-beige dark:border-brand-dark-grey/50 rounded-2xl hover:border-brand-primary dark:hover:border-brand-sage transition-colors cursor-pointer text-brand-sage hover:text-brand-primary p-4 bg-brand-offwhite/30 dark:bg-brand-charcoal/20">
            <FiUploadCloud size={28} className="mb-2" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-center">Add Photos</span>
            <input
              type="file"
              multiple
              accept="image/*"
              disabled={isUploading}
              onChange={(e) => handleFileUpload(e, "images")}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Video Upload */}
      <div className="space-y-2">
        <label className="capitalize font-bold text-xs text-brand-dark-grey dark:text-brand-sage block">
          Upload Video (Optional)
        </label>
        {video ? (
          <div className="flex items-center justify-between p-4 border border-brand-beige dark:border-brand-dark-grey/50 rounded-2xl bg-brand-offwhite/50 dark:bg-brand-charcoal/30">
            <div className="flex items-center gap-3 min-w-0">
              <FiFile size={20} className="text-brand-primary shrink-0" />
              <span className="text-xs font-semibold font-mono truncate max-w-xs">{video.split("/").pop()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreview(video)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <FiEye size={16} />
              </button>
              <button
                type="button"
                onClick={removeVideo}
                className="btn btn-sm btn-circle btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          <label className="flex items-center gap-3 p-4 border-2 border-dashed border-brand-beige dark:border-brand-dark-grey/50 rounded-2xl hover:border-brand-primary dark:hover:border-brand-sage transition-colors cursor-pointer text-brand-sage hover:text-brand-primary bg-brand-offwhite/30 dark:bg-brand-charcoal/20">
            <FiUploadCloud size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">Choose Video File</span>
            <input
              type="file"
              accept="video/*"
              disabled={isUploading}
              onChange={(e) => handleFileUpload(e, "video")}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Preview Dialog */}
      {activePreview && (
        <dialog className="modal modal-open bg-black/60 backdrop-blur-sm z-50">
          <div className="modal-box bg-white dark:bg-brand-charcoal p-0 overflow-hidden max-w-3xl rounded-2xl shadow-2xl relative border border-white/10">
            <button
              onClick={() => setActivePreview(null)}
              className="absolute top-4 right-4 btn btn-sm btn-circle btn-neutral text-white z-10"
            >
              <FiX size={18} />
            </button>
            <div className="flex items-center justify-center p-6 bg-black">
              {activePreview.match(/\.(mp4|webm|ogg)/i) || activePreview.includes("video") ? (
                <video src={activePreview} controls className="max-w-full max-h-[70vh] rounded-lg" />
              ) : (
                <img src={activePreview} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
              )}
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default MediaUploader;
