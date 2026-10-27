import { useId, useState } from 'react'
import chevronDown from '../../../../assets/chevron-down.svg'
import { faq } from '../data/faq'

// Sanfona: uma pergunta aberta por vez; a primeira começa aberta, como no protótipo.
export function FaqAccordion() {
  const baseId = useId()
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <ul className="flex w-full max-w-[840px] flex-col gap-3">
      {faq.map((entry, index) => {
        const open = openIndex === index
        const panelId = `${baseId}-painel-${index}`
        const buttonId = `${baseId}-botao-${index}`

        return (
          <li
            key={entry.question}
            className={`rounded-xl bg-surface px-6 py-5 transition-[border-color] duration-200 ease-out-strong ${
              open ? 'border-[1.5px] border-primary' : 'border border-border'
            }`}
          >
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : index)}
                className="flex w-full cursor-pointer items-center gap-4 rounded text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <span className="flex-1 text-[17px] font-semibold text-navy">{entry.question}</span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                  <img
                    src={chevronDown}
                    alt=""
                    width={20}
                    height={20}
                    className={`transition-transform duration-200 ease-out-strong motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!open}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out-strong motion-reduce:transition-opacity ${
                open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="pt-3 text-[15px] leading-normal text-text-muted">{entry.answer}</p>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
