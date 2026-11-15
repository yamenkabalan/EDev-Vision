'use client';
import type { AssistantChat } from '@/lib/assistant';
import { COPY } from '@/lib/copy';
import { sectionNumber } from '@/lib/sections';
import ChatPanel from './ChatPanel';

/*
  AI: the full-size assistant console and its worldwide data coverage.
*/
export default function AiSection({ chat }: { chat: AssistantChat }) {
  return (
    <section className="ai-section" id="ai" aria-labelledby="ai-title">
      <div className="wrap ai-layout">
        <div className="ai-intro">
          <div className="eyebrow"><span className="section-number">{sectionNumber('ai')}</span> AI · RSYNTHESIS ASSISTANT</div>
          <h2 id="ai-title">Ask about<br /><em>the world’s water.</em></h2>
          <p>Ask about any country or territory, a continent, or the world. The assistant reads the same annual water, climate and projection records shown in <a href="#global">Global water</a> and <a href="#future">Future</a>.</p>
          <div className="ai-facts">
            <div><h3>Data it can read</h3><ul><li>Annual Landsat water area, 1984–2018, for 266 countries and territories</li><li>Rain and heat records, El Niño, and Bayesian estimates through 2030</li><li>Country, continent and whole-world records; local Okavango observations</li></ul></div>
            <div><h3>How to read an answer</h3><ul><li>Check the year, units and source behind each number</li><li>Separate satellite measurements from model projections</li><li>Use the Radar layers to inspect available imagery</li></ul></div>
          </div>
        </div>
        <ChatPanel chat={chat} size="large" title={COPY.chat.title}
          intro={COPY.chat.intro} prompts={COPY.chat.prompts} />
      </div>
    </section>
  );
}
