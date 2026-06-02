import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 | TubeClass',
  description: 'TubeClass 이용약관',
}

const sections = [
  {
    title: '제1조 목적',
    body: '본 약관은 TubeClass가 제공하는 YouTube 영상 큐레이션 학습 서비스의 이용 조건, 이용자와 서비스 운영자 간 권리와 의무, 책임 사항을 정하는 것을 목적으로 합니다.',
  },
  {
    title: '제2조 서비스의 내용',
    body: 'TubeClass는 공개 YouTube 영상의 링크, 임베드, 메타데이터, 카테고리, 난이도, 학습 진행 관리 기능을 제공합니다. 서비스는 원본 영상을 직접 저장하거나 배포하지 않으며, 외부 플랫폼의 정책과 원본 콘텐츠 상태에 따라 제공 범위가 달라질 수 있습니다.',
  },
  {
    title: '제3조 회원 계정',
    body: '이용자는 Google OAuth 등 서비스가 제공하는 인증 방식을 통해 로그인할 수 있습니다. 이용자는 본인의 계정을 안전하게 관리해야 하며, 계정 사용으로 발생한 활동에 대한 책임은 이용자에게 있습니다.',
  },
  {
    title: '제4조 금지 행위',
    body: '이용자는 서비스의 정상 운영을 방해하는 행위, 타인의 권리를 침해하는 행위, 무단 수집 또는 자동화된 과도한 접근, 불법 콘텐츠 등록 요청 또는 공유 행위를 해서는 안 됩니다.',
  },
  {
    title: '제5조 저작권 및 외부 콘텐츠',
    body: 'TubeClass에서 재생되는 영상과 관련 메타데이터의 권리는 각 원저작자, 채널 운영자 또는 권리자에게 있습니다. TubeClass는 학습 편의를 위한 큐레이션과 연결 기능을 제공하며, 권리 침해 신고가 접수되면 검토 후 노출 중단 등 필요한 조치를 취할 수 있습니다.',
  },
  {
    title: '제6조 서비스 변경 및 중단',
    body: '운영자는 서비스 개선, 유지보수, 외부 API 또는 플랫폼 정책 변경, 장애 대응을 위해 서비스의 전부 또는 일부를 변경하거나 일시 중단할 수 있습니다.',
  },
  {
    title: '제7조 책임 제한',
    body: 'TubeClass는 외부 콘텐츠의 정확성, 완전성, 지속적인 제공 가능성을 보장하지 않습니다. 이용자는 학습 목적과 필요에 따라 콘텐츠를 판단해 이용해야 하며, 외부 링크 이동 후 발생하는 문제는 해당 외부 서비스의 정책을 따릅니다.',
  },
  {
    title: '제8조 약관 변경',
    body: '운영자는 필요한 경우 관련 법령과 서비스 운영 정책에 따라 본 약관을 변경할 수 있습니다. 중요한 변경 사항은 서비스 화면 또는 적절한 방법으로 안내합니다.',
  },
]

export default function TermsPage() {
  return (
    <div className="w-full space-y-8 p-4 md:p-6">
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Terms</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">이용약관</h1>
        <p className="text-sm text-muted-foreground">시행일: 2026년 6월 2일</p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {sections.map((section) => (
          <article key={section.title} className="rounded-lg border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
          </article>
        ))}
      </section>

      <p className="text-xs leading-5 text-muted-foreground">
        본 약관은 TubeClass 서비스 운영을 위한 기본 안내문이며, 사업자 정보, 고객센터, 환불 정책,
        유료 서비스 조건 등이 추가되는 경우 실제 운영 형태에 맞춰 보완되어야 합니다. 본 문구는 법률
        자문을 대체하지 않습니다.
      </p>
    </div>
  )
}
