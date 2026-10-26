import type {Board} from '../../src/model';
import {dailyScore,RANKS} from '../../src/effort';
import {mountScore} from '../../src/effort-ui';
/** Rank, XP and its bar are derived together from the current parsed Markdown. */
export function mountHudScore(root:HTMLElement,board:Board,day:string,open:()=>void):void {
  mountScore(root,board,day,open,true);
  const score=dailyScore(board,day),box=root.querySelector<HTMLElement>('.cs-arcade:last-child');if(!box)return;
  box.classList.add('hud-score');box.dataset.scoreDate=day;
  const floor=score.ranks.find(r=>r.name===score.rank)!.points,ceiling=score.ranks.find(r=>r.name===score.next)?.points,maximum=score.ranks.at(-1)!.points;
  const track=root.ownerDocument.createElement('div');track.className='hud-xp-track';track.setAttribute('role','progressbar');track.setAttribute('aria-label','XP toward next rank');
  track.setAttribute('aria-valuemin',String(ceiling===undefined?0:floor));track.setAttribute('aria-valuemax',String(ceiling??maximum));track.setAttribute('aria-valuenow',String(Math.min(score.points,ceiling??maximum)));
  track.setAttribute('aria-valuetext',score.next?`${score.points} XP; ${score.remaining} XP to rank ${score.next}`:`${score.points} XP; rank SSS reached`);
  const fill=root.ownerDocument.createElement('span');fill.style.width=Math.max(0,Math.min(1,score.progress))*100+'%';track.append(fill);
  const caption=root.ownerDocument.createElement('small');caption.className='hud-xp-caption';caption.textContent=score.next?`${score.remaining} XP TO ${score.next}`:'SSS · MAX RANK';
  box.append(track,caption);
}
