'use client';
import type { AssistantChat, ChatContext } from '@/lib/assistant';
import { sectionNumber } from '@/lib/sections';
import ChatPanel from './ChatPanel';

/*
  AI: the full-size assistant console and a plain description of what the
  assistant is, what it knows and what it will not do.
*/
export default function AiSection({ chat, context, contextLabel }: { chat: AssistantChat; context?: ChatContext; contextLabel?: string }) {
  return (
    <section className="ai-section" id="ai" aria-labelledby="ai-title">
      <div className="wrap ai-layout">
        <div className="ai-intro">
          <div className="eyebrow"><span className="section-number">{sectionNumber('ai')}</span> AI · RSYNTHESIS ASSISTANT</div>
          <h2 id="ai-title">Ask the<br /><em>planet.</em></h2>
          <p>The assistant turns the world data on this site into a conversation. Ask about any country, continent or the whole world — a year, the rain, the heat, El Niño or the projection to 2030 — in any language. The place you chose above comes with your question.</p>
          <div className="ai-facts">
            <div><h3>What it knows</h3><ul><li>Surface water of 266 countries and territories, 1984–2018</li><li>Rain and heat for every year (ERA5) and El Niño (NOAA)</li><li>UNEP’s later release, 2018–2022</li><li>Our engine’s weights, projection to 2030 and tests</li></ul></div>
            <div><h3>How it works</h3><ul><li>A language model (OpenAI GPT-5.4 mini; open-weight gpt-oss on Groq as backup)</li><li>It may answer only from our data and three tools: one place, two places, a ranking</li><li>Not trained on your questions; nothing is stored</li></ul></div>
            <div><h3>What it will not do</h3><ul><li>Invent numbers or forecasts</li><li>Claim water depth, volume or drinkability</li><li>Present an association as proof of cause</li></ul></div>
          </div>
          {contextLabel && <p className="ai-context">{contextLabel}</p>}
        </div>
        <ChatPanel chat={chat} context={context} size="large" title="RSynthesis AI"
          intro="What would you like to know about the world’s water?"
          prompts={['Which countries may have less water in 2030?', 'Why did Cambodia lose water?', 'Compare India and Brazil since 2000', 'How sure is the projection for the world?']} />
      </div>
    </section>
  );
}
