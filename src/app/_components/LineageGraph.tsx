"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  colorForSource,
  colorForTool,
  sourcesInUse,
  toolsInUse,
  type Dashboard,
  type Dataset,
  type Relationship,
} from "@/lib/types";

// Node dashboard dùng id có tiền tố để không đụng id dataset.
const DASH_PREFIX = "dash:";

const btnGhost = {
  fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
  border: "1px solid var(--line-strong)", borderRadius: 7, padding: "7px 13px",
} as const;
const btnPrimary = {
  fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)",
  border: "1px solid var(--accent)", borderRadius: 7, padding: "7px 13px",
} as const;

// Bố trí thủ công theo dòng chảy dữ liệu: nguồn gốc bên trái → tổng hợp bên phải
const layout: Record<string, { x: number; y: number }> = {
  danh_muc_nhom_hh: { x: 40, y: 40 },
  doanh_thu_loi_nhuan: { x: 40, y: 180 },
  luong_xe: { x: 40, y: 330 },
  pl_data: { x: 400, y: 40 },
  tong_hop: { x: 430, y: 250 },
};

export default function LineageGraph({
  datasets,
  relationships,
  dashboards,
}: {
  datasets: Dataset[];
  relationships: Relationship[];
  dashboards: Dashboard[];
}) {
  const router = useRouter();

  // Node chưa có toạ độ trong `layout` (vd dataset mới thêm) được xếp thành lưới
  // bên dưới thay vì chồng lên nhau ở (0,0).
  const autoPos = new Map(
    datasets
      .filter((d) => !layout[d.id])
      .map((d, i) => [d.id, { x: 40 + (i % 4) * 260, y: 480 + Math.floor(i / 4) * 130 }])
  );
  const datasetNodes: Node[] = datasets.map((d) => ({
    id: d.id,
    position: layout[d.id] ?? autoPos.get(d.id) ?? { x: 0, y: 0 },
    data: { label: d.ten },
    style: {
      background: "#fff",
      border: `2px solid ${colorForSource(d.nguon)}`,
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      fontWeight: 600,
      width: 220,
      color: "#12212e",
      boxShadow: "0 1px 3px rgba(18,33,46,0.08)",
      cursor: "pointer",
    },
  }));

  // Dashboard xếp thành cột ngoài cùng bên phải — đích cuối của dòng chảy dữ liệu.
  const dashboardNodes: Node[] = dashboards.map((db, i) => ({
    id: DASH_PREFIX + db.id,
    position: { x: 820, y: 40 + i * 110 },
    data: { label: db.ten },
    style: {
      background: "#f8fafa",
      border: `2px dashed ${colorForTool(db.cong_cu)}`,
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      fontWeight: 600,
      width: 220,
      color: "#12212e",
      boxShadow: "0 1px 3px rgba(18,33,46,0.08)",
      cursor: "pointer",
    },
  }));

  const nodes: Node[] = [...datasetNodes, ...dashboardNodes];

  const datasetIds = new Set(datasets.map((d) => d.id));

  const relEdges: Edge[] = relationships.map((r) => ({
    id: r.id,
    source: r.from,
    target: r.to,
    label: r.loai,
    labelStyle: { fontSize: 11, fill: "#3a4d5c", fontWeight: 600 },
    labelBgStyle: { fill: "#f3f5f4" },
    style: { stroke: "#b3bec1", strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "#b3bec1" },
  }));

  // dataset → dashboard. Bỏ qua link trỏ tới dataset đã bị xóa khỏi sơ đồ.
  const dashEdges: Edge[] = dashboards.flatMap((db) =>
    db.datasets
      .filter((l) => datasetIds.has(l.dataset_id))
      .map((l) => ({
        id: `${DASH_PREFIX}${db.id}__${l.dataset_id}`,
        source: l.dataset_id,
        target: DASH_PREFIX + db.id,
        label: l.vai_tro,
        labelStyle: { fontSize: 11, fill: "#3a4d5c", fontWeight: 600 },
        labelBgStyle: { fill: "#f3f5f4" },
        style: { stroke: colorForTool(db.cong_cu), strokeWidth: 1.5, strokeDasharray: "5 3" },
        markerEnd: { type: MarkerType.ArrowClosed, color: colorForTool(db.cong_cu) },
      }))
  );

  const edges: Edge[] = [...relEdges, ...dashEdges];

  const onNodeClick: NodeMouseHandler = (_e, node) =>
    router.push(
      node.id.startsWith(DASH_PREFIX)
        ? `/dashboard/${node.id.slice(DASH_PREFIX.length)}`
        : `/dataset/${node.id}`
    );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Sơ đồ liên kết dữ liệu
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 15 }}>
            Mũi tên thể hiện dòng chảy và khóa liên kết; nét đứt là dataset nuôi
            dashboard. Bấm vào một node để xem chi tiết.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/dataset/new" style={btnGhost}>+ Dataset</Link>
          <Link href="/admin/dashboard/new" style={btnGhost}>+ Dashboard</Link>
          <Link href="/admin/relationships" style={btnPrimary}>+ Thêm liên kết</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, marginBottom: 14, fontSize: 13, flexWrap: "wrap" }}>
        {sourcesInUse(datasets).map((n) => (
          <span key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${colorForSource(n)}` }} />
            {n}
          </span>
        ))}
        {toolsInUse(dashboards).map((n) => (
          <span key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, border: `2px dashed ${colorForTool(n)}` }} />
            {n}
          </span>
        ))}
      </div>

      <div
        style={{
          height: 520,
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--panel)",
          overflow: "hidden",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d4dbdd" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <p style={{ marginTop: 14, fontSize: 13, color: "var(--ink-soft)" }}>
        Thêm/sửa liên kết trong{" "}
        <Link href="/admin/relationships" style={{ color: "var(--accent)", fontWeight: 600 }}>
          Quản trị → Liên kết
        </Link>
        . <Link href="/" style={{ color: "var(--accent)", fontWeight: 600 }}>Về danh mục</Link>.
      </p>
    </div>
  );
}
