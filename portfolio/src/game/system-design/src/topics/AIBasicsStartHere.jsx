import ContentRenderer from '../components/ContentRenderer';
import RelatedTopics from '../components/RelatedTopics';
import content from '../data/content/ai-basics-start-here.json';

const relatedTopics = [
  { slug: 'skill-vs-agent', label: 'Skill vs Agent' },
  { slug: 'prompt-engineering', label: 'Prompt Engineering' },
  { slug: 'ai-tools-landscape', label: 'AI 工具全景圖' },
  { slug: 'coding-agent-design', label: 'Coding Agent 設計' },
];

export default function AIBasicsStartHere() {
  return (
    <div className="topic-container">
      <ContentRenderer blocks={content.blocks} showTOC />
      <RelatedTopics topics={relatedTopics} />
    </div>
  );
}
