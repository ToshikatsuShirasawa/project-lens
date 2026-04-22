import { redirect } from 'next/navigation'

/** 旧 URL。一覧のモーダルへ誘導（ブックマーク互換） */
export default function LegacyNewProjectPage() {
  redirect('/projects?new=1')
}
