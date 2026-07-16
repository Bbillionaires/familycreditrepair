import { toEmbedUrl } from "@/lib/video";

export default function VideoEmbed({ url, title }: { url: string; title: string }) {
  const embedUrl = toEmbedUrl(url);
  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full items-center justify-center text-sm text-blue-600 underline"
      >
        Watch video
      </a>
    );
  }
  return (
    <iframe
      src={embedUrl}
      title={title}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}
