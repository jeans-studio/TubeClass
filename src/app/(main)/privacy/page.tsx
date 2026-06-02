import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '개인정보 처리방침 | TubeClass',
  description: 'TubeClass 개인정보 처리방침',
}

const sections = [
  {
    title: '1. 처리하는 개인정보 항목',
    body: 'TubeClass는 Google OAuth 로그인 과정에서 제공되는 이메일, 프로필 이름, 프로필 이미지, 서비스 사용자 식별자와 서비스 이용 과정에서 생성되는 최근 시청 기록, 학습 진행 상태, 접속 관련 기술 정보를 처리할 수 있습니다.',
  },
  {
    title: '2. 개인정보의 처리 목적',
    body: '개인정보는 회원 식별, 로그인 상태 유지, 학습 진행 관리, 최근 본 영상 제공, 서비스 안정화와 보안, 문의 대응, 서비스 품질 개선을 위해 사용됩니다.',
  },
  {
    title: '3. 보유 및 이용 기간',
    body: '개인정보는 회원 탈퇴 또는 처리 목적 달성 시 지체 없이 파기하는 것을 원칙으로 합니다. 다만 법령에 따라 보관이 필요한 정보는 해당 기간 동안 분리 보관할 수 있습니다.',
  },
  {
    title: '4. 제3자 제공 및 처리 위탁',
    body: 'TubeClass는 원칙적으로 이용자의 개인정보를 외부에 판매하거나 임의 제공하지 않습니다. 인증, 데이터 저장, 영상 재생 등 서비스 제공을 위해 Google, YouTube, Supabase 등 외부 서비스가 사용될 수 있으며, 각 제공자의 정책이 함께 적용될 수 있습니다.',
  },
  {
    title: '5. 이용자의 권리',
    body: '이용자는 본인의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 서비스 운영자는 본인 확인 후 관련 법령에 따라 필요한 조치를 진행합니다.',
  },
  {
    title: '6. 안전성 확보 조치',
    body: 'TubeClass는 인증 기반 접근 제어, 데이터베이스 권한 관리, 필요한 범위의 개인정보 처리, 관리자 접근 제한 등 개인정보 보호를 위한 기술적, 관리적 조치를 적용합니다.',
  },
  {
    title: '7. 쿠키 및 유사 기술',
    body: '서비스는 로그인 유지, 보안, 사용자 환경 제공을 위해 쿠키 또는 유사 저장 기술을 사용할 수 있습니다. 브라우저 설정을 통해 쿠키 저장을 제한할 수 있으나 일부 기능 이용이 제한될 수 있습니다.',
  },
  {
    title: '8. 문의 및 권리 행사',
    body: '개인정보 관련 문의와 권리 행사는 TubeClass 운영자에게 요청할 수 있습니다. 정식 서비스 오픈 전 실제 운영자명, 연락처, 개인정보 보호책임자 정보를 반드시 확정해 기재해야 합니다.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="w-full space-y-8 p-4 md:p-6">
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Privacy</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">개인정보 처리방침</h1>
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

      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="text-xs leading-5 text-muted-foreground">
          개인정보보호위원회는 개인정보 처리방침 명칭을 “개인정보 처리방침”으로 사용하고, 처리 목적,
          처리 항목, 보유 기간, 제3자 제공, 처리 위탁, 정보주체 권리 행사 방법 등을 알기 쉽게 공개하도록
          안내하고 있습니다. 현재 문구는 개발용 기본안이므로 실제 운영자 정보, 연락처, 위탁 현황,
          보유 기간은 정식 배포 전에 서비스 운영 사실에 맞춰 확정해야 합니다.
        </p>
      </div>
    </div>
  )
}
