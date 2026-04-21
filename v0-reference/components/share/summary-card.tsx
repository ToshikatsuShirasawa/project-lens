"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Copy,
  Download,
  Share2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
} from "lucide-react"
import { useState } from "react"

interface SummaryData {
  title: string
  currentSituation: string
  issues: string[]
  risks: string[]
  unresolvedPoints: string[]
  nextActions: string[]
}

interface SummaryCardProps {
  data: SummaryData
  variant: "team" | "pm" | "management"
}

const variantConfig = {
  team: {
    title: "チーム向けサマリー",
    description: "開発チームへの共有用",
    color: "bg-chart-2/10 text-chart-2",
  },
  pm: {
    title: "PM向けサマリー",
    description: "プロジェクトマネージャー向け",
    color: "bg-primary/10 text-primary",
  },
  management: {
    title: "経営層向けサマリー",
    description: "経営会議や報告用",
    color: "bg-chart-3/10 text-chart-3",
  },
}

export function SummaryCard({ data, variant }: SummaryCardProps) {
  const [copied, setCopied] = useState(false)
  const config = variantConfig[variant]

  const handleCopy = () => {
    const text = `
【${data.title}】

■ 現在の状況
${data.currentSituation}

■ 課題
${data.issues.map((i) => `・${i}`).join("\n")}

■ リスク
${data.risks.map((r) => `・${r}`).join("\n")}

■ 未解決の点
${data.unresolvedPoints.map((u) => `・${u}`).join("\n")}

■ 次のアクション
${data.nextActions.map((a) => `・${a}`).join("\n")}
    `.trim()

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <Badge className={config.color}>{config.title}</Badge>
          <CardTitle className="mt-2 text-lg">{data.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Situation */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle className="h-4 w-4 text-success" />
            現在の状況
          </h4>
          <p className="text-sm text-muted-foreground pl-6">{data.currentSituation}</p>
        </div>

        {/* Issues */}
        {data.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertCircle className="h-4 w-4 text-warning" />
              課題
            </h4>
            <ul className="space-y-1 pl-6">
              {data.issues.map((issue, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {data.risks.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              リスク
            </h4>
            <ul className="space-y-1 pl-6">
              {data.risks.map((risk, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Unresolved Points */}
        {data.unresolvedPoints.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              未解決の点
            </h4>
            <ul className="space-y-1 pl-6">
              {data.unresolvedPoints.map((point, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Actions */}
        {data.nextActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ArrowRight className="h-4 w-4 text-primary" />
              次にやること
            </h4>
            <ul className="space-y-1 pl-6">
              {data.nextActions.map((action, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
