'use client';
import type { AssistantChat } from '@/lib/assistant';
import { COPY } from '@/lib/copy';
import { sectionNumber } from '@/lib/sections';
import ChatPanel from './ChatPanel';

/*
  AI: the full-size assistant console and a plain description of what the
  assistant is, what it knows and what it will not do.
*/
export default function AiSection({ chat }: { chat: AssistantChat }) {
  return (
    <section className="ai-section" id="ai" aria-labelledby="ai-title">
      <div className="wrap ai-layout">
        <div className="ai-intro">
          <div className="eyebrow"><span className="section-number">{sectionNumber('ai')}</span> AI · RSYNTHESIS ASSISTANT</div>
          <h2 id="ai-title">Ask about<br /><em>the Okavango.</em></h2>
          <p>The assistant uses the Okavango Delta case study in Botswana. Explore other regions in <a href="#global">Global water</a> and <a href="#future">Future</a>.</p>
          <div className="ai-facts">
            <div><h3>Case study data</h3><ul><li>NISAR radar observations and Landsat water history</li><li>Upstream rainfall and modelled river discharge</li><li>Historical estimates and projections for the delta</li></ul></div>
            <div><h3>How to read an answer</h3><ul><li>Check whether an area comes from radar, optical imagery or a model</li><li>Use the satellite layers to explore the observations</li></ul></div>
          </div>
        </div>
        <ChatPanel chat={chat} size="large" title={COPY.chat.title}
          intro={COPY.chat.intro} prompts={COPY.chat.prompts} />
      </div>
    </section>
  );
}
