import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Layers3,
  MessageSquareText,
  Route,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export const metadata: Metadata = {
  title: '소개 | TubeClass',
  description: 'AI 학습을 위한 YouTube 강의 큐레이션 플랫폼 TubeClass 소개',
}

export default function AboutPage() {
  return (
    <div className="w-full">
      <section className="border-b">
        <div className="min-h-[calc(100dvh-3.5rem)] p-4 md:p-6">
          <div className="flex min-h-[calc(100dvh-6.5rem)] flex-col justify-center py-12 md:py-16">
            <div className="max-w-5xl space-y-8">
              <div className="space-y-5">
                <p className="text-sm font-medium text-muted-foreground">AI를 배우는 가장 현실적인 방법</p>
                <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                  흩어진 YouTube 강의를
                  <br />
                  하나의 학습 흐름으로 <br />
                  정리합니다.
                </h1>
              </div>
              <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
                TubeClass는 AI 개발과 AI 활용을 배우려는 사람을 위해
                <br />
                공개 YouTube 강의를 주제, 재생목록, 난이도 기준으로 다시 묶는 큐레이션 학습 플랫폼입니다.
                <br />
                좋은 영상은 많지만, 어디서 시작하고 어떤 순서로 이어갈지 막막한 문제를 줄이는 데 집중합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 border-b p-4 md:p-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-medium text-primary">Why TubeClass</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">영상은 많고, 학습 순서는 부족합니다.</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <Layers3 className="mb-4 h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">주제별로 다시 묶기</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Git/GitHub, Claude Code, Codex, Vibe Coding처럼 실제 학습자가 찾는 단위로 영상을 정리합니다.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <Route className="mb-4 h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">재생목록 중심 흐름</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              소카테고리 안에 바로 영상을 쌓지 않고, 목적별 재생목록을 먼저 만들고 그 안에 영상을 배치합니다.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <CheckCircle2 className="mb-4 h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">내 학습 상태 유지</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              최근 본 영상, 완료 상태, 카테고리별 진도, 업적 뱃지를 통해 이어서 볼 지점을 놓치지 않게 합니다.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 border-b p-4 md:p-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-medium text-primary">Learning Map</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">초기 구조는 AI에 집중합니다.</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">AI 개발</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Git/GitHub', 'Claude Code', 'Codex', 'Vibe Coding', 'Vibe Design'].map((item) => (
                <span key={item} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              AI 도구를 활용해 웹사이트, 서비스, 프로토타입을 만드는 흐름에 집중합니다.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <div className="mb-5 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">AI 활용</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {['업무 자동화', '이미지/영상 생성', '마케팅 콘텐츠'].map((item) => (
                <span key={item} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              업무, 콘텐츠 제작, 마케팅처럼 개발자가 아니어도 바로 활용할 수 있는 주제를 다룹니다.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 border-b p-4 md:p-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-medium text-primary">Principles</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">운영 기준은 단순합니다.</h2>
        </div>
        <div className="space-y-4">
          {[
            ['원본을 존중합니다', 'TubeClass는 원본 영상을 직접 호스팅하지 않고, 공개된 YouTube 콘텐츠를 학습 목적에 맞게 연결합니다.'],
            ['학습 흐름을 우선합니다', '인기 영상만 나열하기보다 초급, 중급, 고급과 재생목록 순서를 기준으로 실제 학습 흐름을 만듭니다.'],
            ['빠르게 업데이트합니다', 'AI는 변화 속도가 빠르기 때문에 더 이상 필요 없거나 잘못된 정보를 줄 수 있는 오래된 영상은 수시로 내리고, 새로운 영상으로 계속 갱신합니다.'],
            ['피드백을 반영합니다', '잘못된 분류, 삭제 요청, 추천 콘텐츠, 개선 의견은 피드백으로 받고 운영자가 검토합니다.'],
          ].map(([title, description]) => (
            <div key={title} className="grid grid-cols-1 gap-2 rounded-xl border bg-card p-5 md:grid-cols-[14rem_minmax(0,1fr)]">
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="p-4 md:p-6">
        <div className="rounded-xl border bg-muted/40 p-5 md:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2rem_minmax(0,1fr)]">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">콘텐츠 및 권리 관련 안내</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                TubeClass에 표시되는 영상 제목, 썸네일, 채널명, 설명 등은 원본 YouTube 콘텐츠 또는
                운영자가 입력한 메타데이터를 기반으로 표시됩니다. 각 영상의 저작권과 책임은 원저작자
                또는 제공자에게 있으며, TubeClass는 학습 편의를 위한 링크와 임베드 환경을 제공합니다.
                외부 플랫폼 정책 변경, 원본 영상 삭제, 공개 범위 변경에 따라 일부 콘텐츠가 표시되지
                않을 수 있습니다. 권리 침해, 부정확한 정보, 삭제 요청 등 콘텐츠 관련 문제가 있다면
                피드백으로 알려주세요.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <Link
                  href="/feedback"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  피드백 남기기
                  <MessageSquareText className="h-3 w-3" />
                </Link>
                <Link href="/terms" className="inline-flex items-center gap-1 text-primary hover:underline">
                  이용약관
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <Link href="/privacy" className="inline-flex items-center gap-1 text-primary hover:underline">
                  개인정보 처리방침
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
