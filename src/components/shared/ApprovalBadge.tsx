export default function ApprovalBadge({ approval }: { approval: boolean | null }) {
  if (approval === true)
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
        Approved
      </span>
    );
  if (approval === false)
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
        Rejected
      </span>
    );
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
      Pending
    </span>
  );
}
