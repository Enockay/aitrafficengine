import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { FAQS } from './data'
import { Eyebrow } from './Eyebrow'

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="landing-card transition-all hover:border-border-default/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[15px] font-medium text-text-primary">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-[14px] leading-relaxed text-text-secondary">{a}</p>
        </div>
      </div>
    </div>
  )
}

export function FAQ() {
  return (
    <section id="faq" className="relative scroll-mt-20">
      <div className="relative mx-auto max-w-3xl px-6 py-24 md:py-32">
        <div className="text-center">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Frequently asked</h2>
        </div>
        <div className="mt-12 space-y-3">
          {FAQS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  )
}
