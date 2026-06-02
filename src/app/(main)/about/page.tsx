import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen, ExternalLink, Mail, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: '소개 | TubeClass',
  description: 'TubeClass 서비스 소개',
}

export default function AboutPage() {
  return (
    <div className="w-full space-y-8 p-4 md:p-6">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          About
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">TubeClass 소개</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            TubeClass는 공개 YouTube 영상을 학습 목적에 맞게 카테고리와 난이도별로 정리해 보여주는
            큐레이션 학습 플랫폼입니다. 사용자는 주제별 강의 목록을 탐색하고, 학습 상태와 최근 시청
            기록을 통해 이어보기 흐름을 관리할 수 있습니다.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">큐레이션</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            영상은 대카테고리, 소카테고리, 난이도 기준으로 정리됩니다. 서비스는 원본 영상을 직접
            호스팅하지 않고 YouTube 재생 환경을 통해 제공합니다.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">학습 관리</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            로그인 사용자는 최근 본 영상과 학습 진행 상태를 확인할 수 있습니다. 학습 데이터는 서비스
            기능 제공과 개선 목적 범위에서 사용됩니다.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">운영 원칙</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            TubeClass는 원저작자의 권리를 존중하며, 문제 제기나 삭제 요청이 접수되면 검토 후 필요한
            조치를 취합니다.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-muted/40 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">법적 고지</h2>
            <p className="text-xs leading-5 text-muted-foreground">
              TubeClass에 표시되는 영상 제목, 썸네일, 채널명, 설명 등은 원본 YouTube 콘텐츠 또는
              운영자가 입력한 메타데이터를 기반으로 표시됩니다. 각 영상의 저작권과 책임은 원저작자
              또는 제공자에게 있으며, TubeClass는 학습 편의를 위한 링크와 임베드 환경을 제공합니다.
              외부 플랫폼 정책 변경, 원본 영상 삭제, 공개 범위 변경에 따라 일부 콘텐츠가 표시되지
              않을 수 있습니다. 권리 침해, 부정확한 정보, 삭제 요청 등 콘텐츠 관련 문제가 있다면
              운영자에게 알려주세요.
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <a
                href="mailto:contact@tubeclass.app?subject=TubeClass%20%EC%BD%98%ED%85%90%EC%B8%A0%20%EB%AC%B8%EC%9D%98"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                문제 신고 메일 보내기
                <Mail className="h-3 w-3" />
              </a>
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
      </section>
    </div>
  )
}
