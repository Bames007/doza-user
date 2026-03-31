// import { Globe, Lock, Target, Trophy, Users } from "lucide-react";

// import { motion } from "framer-motion";

// export const ChallengeCard = ({
//   challenge,
//   profile,
//   isCreator,
//   isParticipant,
//   onJoin,
//   onView,
//   onLeave,
// }: {
//   challenge: Challenge;
//   profile: any;
//   isCreator: boolean;
//   isParticipant: boolean;
//   onJoin: () => void;
//   onView: () => void;
//   onLeave: () => void;
// }) => {
//   const now = new Date();
//   const start = new Date(challenge.startDate);
//   const end = new Date(challenge.endDate);
//   const isActive = now >= start && now <= end;
//   const isEnded = now > end;

//   const progress = isParticipant
//     ? challenge.participants[profile?.id || ""]?.progress || 0
//     : 0;

//   const progressPercent = Math.min(
//     100,
//     Math.round(((progress as number) / challenge.targetValue) * 100),
//   );

//   return (
//     <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group">
//       <div className="relative h-28 w-full overflow-hidden">
//         {challenge.imageUrl ? (
//           <img
//             src={challenge.imageUrl}
//             alt={challenge.name}
//             className="w-full h-full object-cover transition-transform group-hover:scale-105"
//           />
//         ) : (
//           <div className="w-full h-full bg-emerald-50 flex items-center justify-center">
//             <Trophy className="w-8 h-8 text-emerald-200" />
//           </div>
//         )}
//         <div className="absolute top-2 left-2 flex gap-1">
//           <span className="px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[10px] rounded-full flex items-center gap-1">
//             {challenge.isPublic ? (
//               <Globe className="w-3 h-3" />
//             ) : (
//               <Lock className="w-3 h-3" />
//             )}
//             {challenge.isPublic ? "Public" : "Private"}
//           </span>
//           {isEnded && (
//             <span className="px-2 py-0.5 bg-red-500/80 backdrop-blur-md text-white text-[10px] rounded-full">
//               Ended
//             </span>
//           )}
//         </div>
//       </div>

//       <div className="p-3 flex-1 flex flex-col">
//         <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">
//           {challenge.name}
//         </h3>
//         <p className="text-[10px] text-gray-500 line-clamp-2 mb-2 flex-1">
//           {challenge.description}
//         </p>

//         <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
//           <div className="flex items-center gap-1">
//             <Users className="w-3 h-3" /> {challenge.participantCount || 0}
//           </div>
//           <div className="flex items-center gap-1">
//             <Target className="w-3 h-3" /> {challenge.targetValue}{" "}
//             {challenge.targetUnit}
//           </div>
//         </div>

//         {isParticipant && (
//           <div className="mb-3">
//             <div className="flex justify-between text-[10px] mb-1">
//               <span className="text-gray-500">Progress</span>
//               <span className="font-bold text-emerald-600">
//                 {progressPercent}%
//               </span>
//             </div>
//             <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
//               <motion.div
//                 initial={{ width: 0 }}
//                 animate={{ width: `${progressPercent}%` }}
//                 className="h-full bg-emerald-500"
//               />
//             </div>
//           </div>
//         )}

//         <div className="flex gap-2 mt-auto">
//           <button
//             onClick={onView}
//             className="flex-1 py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl"
//           >
//             View
//           </button>
//           {!isParticipant && isActive && (
//             <button
//               onClick={onJoin}
//               className="flex-1 py-2 bg-emerald-600 text-white text-xs rounded-xl"
//             >
//               {challenge.isPublic ? "Join" : "Request"}
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };
