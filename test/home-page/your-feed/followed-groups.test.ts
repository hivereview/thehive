import { followedGroups } from '../../../src/home-page/your-feed/followed-groups';
import { userFollowedEditorialCommunity, userUnfollowedEditorialCommunity } from '../../../src/types/domain-events';
import { GroupId } from '../../../src/types/group-id';
import { toUserId } from '../../../src/types/user-id';

describe('followed-groups', () => {
  const userId = toUserId('user');

  describe('there are no follow events', () => {
    it('returns an empty array', () => {
      const groupIds = followedGroups([])(userId);

      expect(groupIds).toStrictEqual([]);
    });
  });

  describe('there is a single follow event for the user', () => {
    it('returns the group id', () => {
      const groupId = new GroupId('group');
      const events = [userFollowedEditorialCommunity(userId, groupId)];
      const groupIds = followedGroups(events)(userId);

      expect(groupIds).toStrictEqual([groupId]);
    });
  });

  describe('there is a single follow event and a single unfollow event for the user', () => {
    it('returns an empty array', () => {
      const groupId = new GroupId('group');
      const sameGroupId = new GroupId('group');
      const events = [
        userFollowedEditorialCommunity(userId, groupId),
        userUnfollowedEditorialCommunity(userId, sameGroupId),
      ];
      const groupIds = followedGroups(events)(userId);

      expect(groupIds).toStrictEqual([]);
    });
  });

  describe('there are 2 follow events for different groups for the user', () => {
    it('returns the group ids', () => {
      const groupId1 = new GroupId('group1');
      const groupId2 = new GroupId('group2');
      const events = [
        userFollowedEditorialCommunity(userId, groupId1),
        userFollowedEditorialCommunity(userId, groupId2),
      ];
      const groupIds = followedGroups(events)(userId);

      expect(groupIds).toStrictEqual([groupId1, groupId2]);
    });
  });

  describe('there are 2 follow events and 1 unfollow events for the user', () => {
    it('returns the group ids of the still followed group', () => {
      const groupId1 = new GroupId('group1');
      const groupId2 = new GroupId('group1');
      const events = [
        userFollowedEditorialCommunity(userId, groupId1),
        userFollowedEditorialCommunity(userId, groupId2),
        userUnfollowedEditorialCommunity(userId, groupId1),
      ];
      const groupIds = followedGroups(events)(userId);

      expect(groupIds).toStrictEqual([groupId2]);
    });
  });

  describe('there is only a follow event for another user', () => {
    it('returns an empty array', () => {
      const groupId = new GroupId('group');
      const events = [
        userFollowedEditorialCommunity(toUserId('other-user'), groupId),
      ];
      const groupIds = followedGroups(events)(userId);

      expect(groupIds).toStrictEqual([]);
    });
  });

  describe('there is a single follow event for the user, and a follow and unfollow event for another user', () => {
    it('returns an empty array', () => {
      const groupId = new GroupId('group');
      const otherUserId = toUserId('other-user');
      const events = [
        userFollowedEditorialCommunity(userId, groupId),
        userFollowedEditorialCommunity(otherUserId, groupId),
        userUnfollowedEditorialCommunity(otherUserId, groupId),
      ];
      const groupIds = followedGroups(events)(userId);

      expect(groupIds).toStrictEqual([groupId]);
    });
  });
});
