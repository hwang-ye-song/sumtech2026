import { CHECKED_SOURCES, DATA_CHECKED_ON, NO_RECORD_MESSAGE } from '@/lib/labels'

/** 규칙이 없을 때: 단정하지 않는 문구 + 확인한 자료·날짜 + 약사에게 물을 말 */
export function NoRecordCard({ lead }: { lead?: string }) {
  return (
    <div className="notice notice-none" role="status" data-testid="no-record">
      {lead ? <p style={{ margin: '0 0 4px' }}>{lead}</p> : null}
      <strong>{NO_RECORD_MESSAGE}</strong>
      <p className="faint" style={{ margin: '8px 0 0' }}>
        확인한 자료: {CHECKED_SOURCES} / DB 확인 날짜 {DATA_CHECKED_ON}
      </p>
      <p className="faint" style={{ margin: '4px 0 0' }}>
        약사에게 물어보세요: 지금 먹는 약·영양제 목록을 보여 드리고 같이 먹어도 되는지 확인하세요.
      </p>
    </div>
  )
}
