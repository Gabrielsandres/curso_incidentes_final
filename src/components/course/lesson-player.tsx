import type { LessonWithMaterials } from "@/lib/courses/types";

type LessonPlayerProps = {
  lesson: LessonWithMaterials;
};

export function LessonPlayer({ lesson }: LessonPlayerProps) {
  const embedUrl = buildYouTubeEmbedUrl(lesson.video_url);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Aula</p>
        <h1 className="text-2xl font-semibold text-slate-900">{lesson.title}</h1>
        {lesson.description ? <p className="text-sm text-slate-600">{lesson.description}</p> : null}
      </div>

      {embedUrl ? (
        <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black">
          <iframe
            title={lesson.title}
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Não conseguimos carregar o vídeo desta aula. Verifique se o link armazenado em Supabase é um vídeo do YouTube
          válido.
        </div>
      )}
    </section>
  );
}

function buildYouTubeEmbedUrl(videoUrl: string) {
  try {
    const parsed = new URL(videoUrl);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0`;
      }
    }

    if (host === "youtube.com") {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments[0] === "embed" && segments[1]) {
        return `https://www.youtube.com/embed/${segments[1]}?rel=0`;
      }

      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0`;
      }
    }

    return videoUrl;
  } catch {
    return null;
  }
}
