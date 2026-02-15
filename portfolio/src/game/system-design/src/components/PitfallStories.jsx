export default function PitfallStories({ stories }) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="card mt-6">
      <h2 className="text-lg font-bold text-text-primary mb-4">💥 踩坑故事</h2>
      {stories.map((story, i) => (
        <div
          key={i}
          className="p-4 rounded-lg bg-bg-tertiary border border-border mb-3 last:mb-0"
        >
          <h4 className="text-accent-amber-light text-[0.95rem] font-semibold mb-2">
            {story.title}
          </h4>
          <p className="text-text-muted text-[0.88rem] leading-relaxed">
            {story.content}
          </p>
          {story.lesson && (
            <p className="mt-2 text-accent-green-light text-[0.85rem]">
              💡 {story.lesson}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
