import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import useColor from "@/hooks/useColor";
import { PostMediaModel } from "@/api/features/post/models/PostResponseModel";
import ReactPlayer from "react-player";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Image } from "antd";
interface MediaViewProps {
  mediaItems: PostMediaModel[];
}

const MediaView: React.FC<MediaViewProps> = React.memo(({ mediaItems }) => {
  const { brandPrimary, lightGray } = useColor();

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
    customPaging: (i: number) => (
      <div
        style={{
          backgroundColor: lightGray,
          width: 10,
          height: 10,
          borderRadius: "50%",
        }}
      />
    ),
    dotsClass: "slick-dots",
  };

  return (
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      <Slider {...settings}>
        {mediaItems?.map((media, index) => {
          const isVideo =
            media?.media_url?.endsWith(".mp4") ||
            media?.media_url?.endsWith(".mov"); 
          return (
            <div key={index}>
              {isVideo ? (
                <ReactPlayer
                  url={media?.media_url || ""}
                  controls
                  loop
                  muted
                  playing
                  style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <Image
                  src={media?.media_url || ""}
                  alt={`media-${index}`}
                  style={{ width: "100%", objectFit: "cover" }}
                  width="100%"
                />
              ) }
            </div>
          );
        })}
       
      </Slider>
    </div>
  );
});

export default MediaView;
