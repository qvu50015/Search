import Image from "next/image";

import { Button } from "@/components/ui/button";
import {ConnectGitHubButton} from "@/components/ui/signin-button"

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-[#060606]">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-147">
          <div className="flex items-center gap-[10.5px]">
            <span className="h-10.5 w-[3.5px] shrink-0 bg-[#39d353]" />
            <h1 className="relative w-max font-jetbrains-mono text-[77px] font-extrabold leading-19.25 tracking-[-1.54px] text-[#c9d1d9] before:absolute before:inset-0 before:animate-typewriter before:bg-[#060606] before:content-[''] after:absolute after:inset-0 after:w-[0.125em] after:animate-caret after:bg-[#ffffff] after:content-['']">
              CODESEARCH
            </h1>
          </div>
          <div className="opacity-0 animate-fade-in">
            <p className="mt-2 pl-[17.5px] font-inter text-[12.5px] leading-[19.9px] text-[#484f58]">
              Search your repositories with <span className="font-extrabold text-[#c9d1d9]">natural language.</span>
              <br />
              Find code by <span className="font-semibold text-[#c9d1d9]">concept</span> — not filename, not keyword.
            </p>
            <ul className="mt-9 flex flex-col gap-3 pl-[17.5px] font-inter text-[12px] text-[#484f58]">
              <li className="flex gap-[10.5px]">
                <span className="font-inter text-[#39d353]">→</span>
                <span>Search your codebase in plain English</span>
              </li>
              <li className="flex gap-[10.5px]">
                <span className="font-inter text-[#39d353]">→</span>
                <span>Finds function even when you don't remember the name</span>
              </li>
              <li className="flex gap-[10.5px]">
                <span className="font-inter text-[#39d353]">→</span>
                <span>Jump straight to the file and line that matters</span>
              </li>
              <li className="flex gap-[10.5px]">
                <span className="font-inter text-[#39d353]">→</span>
                <span>Works on any Typescript, Javascript, or Python repository you own</span>
              </li>
            </ul>
            <div className="mt-11 pl-[17.5px]">
              <ConnectGitHubButton/>
              <p className="mt-[10.5px] font-inter text-[10.5px] text-[#484f58]">
                Read-only GitHub Access · Code securely stored in your private index · Embeddings via
                OpenAI API.
              </p>
            </div>
          </div>
        </div>
      </main>
      <footer className="opacity-0 animate-fade-in border-t border-[#21262d] px-7 py-3.75">
        <div className="flex gap-7 font-inter text-[10.5px]">
          <div className="flex gap-2.5">
            <span className="text-[#484f58] font-bold">By <a className="no-underline hover:underline" href="https://github.com/vnnphm">Vinny Pham </a>&
            <a className="no-underline hover:underline" href="https://github.com/qvu50015"> Quang Vu</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
