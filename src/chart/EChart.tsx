"use client";

import { useEffect, useRef, useState } from 'react'
import type * as echartsNS from 'echarts'
import type { EChartsOption } from 'echarts'

// Port từ `ui-chart-catalog/src/chart/components/EChart.tsx`. Khác bản gốc một
// điểm: bỏ phần `onClick` phục vụ lọc chéo — app này chưa có tính năng đó, và
// cách bản gốc giữ handler (ghi ref ngay trong render) bị eslint ở đây chặn.

interface Props {
  option: EChartsOption
  height?: number
  /** Đổi giá trị này để buộc vẽ lại từ đầu (ví dụ khi đổi light/dark). */
  resetKey?: string
}

type EChartsModule = typeof echartsNS

/**
 * Nạp ECharts (~1MB) theo yêu cầu, dùng chung một promise cho mọi biểu đồ.
 * Nhờ vậy thư viện không nằm trong bundle đầu của app — người chỉ tra
 * component thì không phải tải nó.
 */
let cached: EChartsModule | null = null
let pending: Promise<EChartsModule> | null = null

function loadECharts(): Promise<EChartsModule> {
  if (cached) return Promise.resolve(cached)
  pending ??= import('echarts').then((m) => {
    cached = m
    return m
  })
  return pending
}

/**
 * Wrapper mỏng quanh ECharts — không dùng echarts-for-react để giữ app
 * self-contained và tránh lệ thuộc phiên bản peer React.
 */
export function EChart({ option, height = 280, resetKey }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chart = useRef<echartsNS.ECharts | null>(null)
  const [lib, setLib] = useState<EChartsModule | null>(cached)

  useEffect(() => {
    if (lib) return
    let alive = true
    loadECharts().then((m) => {
      if (alive) setLib(m)
    })
    return () => {
      alive = false
    }
  }, [lib])

  useEffect(() => {
    if (!lib || !ref.current) return
    chart.current = lib.init(ref.current, undefined, { renderer: 'svg' })
    const ro = new ResizeObserver(() => chart.current?.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      chart.current?.dispose()
      chart.current = null
    }
  }, [lib, resetKey])

  useEffect(() => {
    chart.current?.setOption(option, true)
  }, [option, lib])

  return <div ref={ref} style={{ width: '100%', height }} />
}
