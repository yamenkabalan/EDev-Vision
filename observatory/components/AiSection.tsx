'use client';
import type { AssistantChat, ChatContext } from '@/lib/assistant';
import { sectionNumber } from '@/lib/sections';
import ChatPanel from './ChatPanel';

/*
  AI: the full-size Delta AI console and a plain description of what the
  assistant is, what it knows and what it will not do.
*/
export default function AiSection({ chat, context, contextLabel }: { chat: AssistantChat; context?: ChatContext; contextLabel?: string }) {
  return (
    <section className="ai-section" id="ai" aria-labelledby="ai-title">
      <div className="wrap ai-layout">
        <div className="ai-intro">
          <div className="eyebrow"><span className="section-number">{sectionNumber('ai')}</span> AI · DELTA ASSISTANT</div>
          <h2 id="ai-title">Ask the<br /><em>delta.</em></h2>
          <p>Delta AI turns this whole site into a conversation. Ask about a year, a radar date, the rain, the river or the projection to 2030, in any language.</p>
          <div className="ai-facts">
            <div><h3>What it knows</h3><ul><li>Our NISAR 2026 radar measurements</li><li>41 years of Landsat open water</li><li>Rain, river flow, El Niño and heat for every year</li><li>The RSynthesis projection to 2030</li><li>Reported floods and droughts</li></ul></div>
            <div><h3>How it works</h3><ul><li>A language model (OpenAI GPT-5.4 mini; open-weight gpt-oss on Groq as backup)</li><li>It may answer only from our data file and three data tools: year summary, radar date, compare years</li><li>Not trained on your questions; nothing is stored</li></ul></div>
            <div><h3>What it will not do</h3><ul><li>Invent numbers or forecasts</li><li>Claim water depth, volume or drinkability</li><li>Present an association as proof of cause</li></ul></div>
          </div>
          {contextLabel && <p className="ai-context">{contextLabel}</p>}
        </div>
        <ChatPanel chat={chat} context={context} size="large" title="Delta AI"
          intro="What would you like to know about the Okavango flood pulse?"
          prompts={['What changed in the Okavango in 2026?', 'Why was 2019 so dry?', 'How does rain in Angola reach the Delta?', 'What will the flood look like in 2030?']} />
      </div>
    </section>
  );
}
