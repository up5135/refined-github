/*
Reaction avatars showing who reacted to a comment.

Feature testable on
https://github.com/babel/babel/pull/3646
https://github.com/dominictarr/event-stream/issues/116
*/

import './reactions-avatars.css';
import React from 'dom-chef';
import select from 'select-dom';
import debounce from 'debounce-fn';
import {timerIntervalometer} from 'intervalometer';
import features from '../libs/features';
import {getUsername, flatZip} from '../libs/utils';

const arbitraryAvatarLimit = 36;
const approximateHeaderLength = 3; // Each button header takes about as much as 3 avatars

type Participant = {
	container: HTMLElement;
	username: string;
};

function getParticipants(container: HTMLElement): Participant[] {
	const currentUser = getUsername();
	return container.getAttribute('aria-label')!
		.replace(/ reacted with.*/, '')
		.replace(/,? and /, ', ')
		.replace(/, \d+ more/, '')
		.replace(/\[bot\]/g, '')
		.split(', ')
		.filter(username => username !== currentUser)
		.map((username): Participant => ({
			container,
			username
		}));
}

function add(): void {
	for (const list of select.all('.has-reactions .comment-reactions-options:not(.rgh-reactions)')) {
		const avatarLimit = arbitraryAvatarLimit - (list.children.length * approximateHeaderLength);

		const participantByReaction = [...list.children as HTMLCollectionOf<HTMLElement>].map(getParticipants);
		const flatParticipants = flatZip(participantByReaction, avatarLimit);

		for (const participant of flatParticipants) {
			participant.container.append(
				<a href={`/${participant.username}`}>
					<img src={`/${participant.username}.png?size=${window.devicePixelRatio * 20}`}/>
				</a>
			);
		}

		list.classList.add('rgh-reactions');

		// Overlap reaction avatars when near the avatarLimit
		if (flatParticipants.length > avatarLimit * 0.9) {
			list.classList.add('rgh-reactions-near-limit');
		}
	}
}

function init(): void {
	add();

	// GitHub receives update messages via WebSocket, which seem to trigger
	// a fetch for the updated content. When the content is actually updated
	// in the DOM there are no further events, so we have to look for changes
	// every 300ms for the 3 seconds following the last message.
	// This should be lighter than using MutationObserver on the whole page.
	const updater = timerIntervalometer(add, 300);
	const cancelInterval = debounce(updater.stop, {wait: 3000});
	window.addEventListener('socket:message', () => {
		updater.start();
		cancelInterval();
	});
}

features.add({
	id: 'reactions-avatars',
	include: [
		features.hasComments
	],
	load: features.onNewComments,
	init
});
